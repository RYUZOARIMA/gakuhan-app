import { randomUUID, randomInt, createHash } from "node:crypto";
import { pool, schemaReady } from "./db";
import { createOrder, type OrderInput, type CreatedOrder, type NameImageInput } from "./orders";
import { sendOrderVerificationCode } from "./mailer";

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_RESENDS = 3;

type OrderPayload = Omit<OrderInput, "schoolId" | "nameImage">;

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export type PendingOrderInput = OrderInput & { schoolName: string };

export async function createOrderVerification(
  input: PendingOrderInput,
): Promise<{ verificationId: string; email: string }> {
  await schemaReady;

  // 期限切れの未確定分がたまり続けないよう、都度ついでに掃除しておく。
  await pool.query(
    "DELETE FROM order_verifications WHERE expires_at < now() - interval '1 day'",
  );

  const { schoolId, schoolName, nameImage, ...payload } = input;
  const verificationId = randomUUID();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await pool.query(
    `INSERT INTO order_verifications
       (id, school_id, email, code_hash, payload, name_image, name_image_type, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      verificationId,
      schoolId,
      input.email,
      hashCode(code),
      JSON.stringify(payload),
      nameImage?.data ?? null,
      nameImage?.contentType ?? null,
      expiresAt,
    ],
  );

  await sendOrderVerificationCode({
    to: input.email,
    schoolName,
    code,
    studentName: input.studentName,
  });

  return { verificationId, email: input.email };
}

export async function resendOrderVerificationCode(
  verificationId: string,
  schoolName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await schemaReady;

  const result = await pool.query<{
    email: string;
    payload: OrderPayload;
    consumedat: string | null;
    expiresat: string;
    resendcount: number;
    lastsentat: string;
  }>(
    `SELECT email, payload, consumed_at::text as consumedat, expires_at::text as expiresat,
            resend_count as resendcount, last_sent_at::text as lastsentat
     FROM order_verifications WHERE id = $1`,
    [verificationId],
  );
  const row = result.rows[0];
  if (!row) return { ok: false, error: "確認情報が見つかりません。最初からやり直してください。" };
  if (row.consumedat) return { ok: false, error: "この注文はすでに確定しています。" };
  if (new Date(row.expiresat).getTime() < Date.now()) {
    return { ok: false, error: "確認コードの有効期限が切れました。最初からやり直してください。" };
  }
  if (row.resendcount >= MAX_RESENDS) {
    return { ok: false, error: "再送信の上限に達しました。最初からやり直してください。" };
  }
  if (Date.now() - new Date(row.lastsentat).getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: "再送信は少し間隔を空けてからお試しください。" };
  }

  const code = generateCode();
  await pool.query(
    `UPDATE order_verifications
     SET code_hash = $1, attempts = 0, resend_count = resend_count + 1, last_sent_at = now()
     WHERE id = $2`,
    [hashCode(code), verificationId],
  );

  await sendOrderVerificationCode({
    to: row.email,
    schoolName,
    code,
    studentName: row.payload.studentName,
  });

  return { ok: true };
}

export async function confirmOrderVerification(
  verificationId: string,
  code: string,
): Promise<
  | {
      ok: true;
      order: CreatedOrder;
      customer: Pick<
        OrderPayload,
        "studentName" | "grade" | "guardianName" | "phone" | "email"
      >;
    }
  | { ok: false; error: string }
> {
  await schemaReady;

  const client = await pool.connect();
  let confirmedSchoolId: string | undefined;
  let confirmedPayload: OrderPayload | undefined;
  let confirmedNameImage: NameImageInput | undefined;

  try {
    await client.query("BEGIN");

    const result = await client.query<{
      schoolid: string;
      codehash: string;
      payload: OrderPayload;
      nameimage: Buffer | null;
      nameimagetype: string | null;
      attempts: number;
      expiresat: string;
      consumedat: string | null;
    }>(
      `SELECT school_id as schoolid, code_hash as codehash, payload,
              name_image as nameimage, name_image_type as nameimagetype,
              attempts, expires_at::text as expiresat, consumed_at::text as consumedat
       FROM order_verifications WHERE id = $1 FOR UPDATE`,
      [verificationId],
    );

    const row = result.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false, error: "確認情報が見つかりません。最初からやり直してください。" };
    }
    if (row.consumedat) {
      await client.query("ROLLBACK");
      return { ok: false, error: "この注文はすでに確定しています。" };
    }
    if (new Date(row.expiresat).getTime() < Date.now()) {
      await client.query("ROLLBACK");
      return { ok: false, error: "確認コードの有効期限が切れました。最初からやり直してください。" };
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      await client.query("ROLLBACK");
      return { ok: false, error: "入力回数の上限を超えました。最初からやり直してください。" };
    }

    if (hashCode(code) !== row.codehash) {
      await client.query(
        "UPDATE order_verifications SET attempts = attempts + 1 WHERE id = $1",
        [verificationId],
      );
      await client.query("COMMIT");
      const remaining = MAX_ATTEMPTS - (row.attempts + 1);
      return {
        ok: false,
        error:
          remaining > 0
            ? `確認コードが正しくありません。（あと${remaining}回まで入力できます）`
            : "入力回数の上限を超えました。最初からやり直してください。",
      };
    }

    await client.query(
      "UPDATE order_verifications SET consumed_at = now() WHERE id = $1",
      [verificationId],
    );
    await client.query("COMMIT");

    confirmedSchoolId = row.schoolid;
    confirmedPayload = row.payload;
    confirmedNameImage = row.nameimage
      ? { data: row.nameimage, contentType: row.nameimagetype ?? "application/octet-stream" }
      : undefined;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const order = await createOrder({
    schoolId: confirmedSchoolId!,
    ...confirmedPayload!,
    nameImage: confirmedNameImage,
  });

  return {
    ok: true,
    order,
    customer: {
      studentName: confirmedPayload!.studentName,
      grade: confirmedPayload!.grade,
      guardianName: confirmedPayload!.guardianName,
      phone: confirmedPayload!.phone,
      email: confirmedPayload!.email,
    },
  };
}

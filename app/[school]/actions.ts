"use server";

import { z } from "zod";
import { getSchoolBySlug } from "@/lib/schools";
import { sendOrderNotification } from "@/lib/mailer";
import {
  createOrderVerification,
  confirmOrderVerification,
  resendOrderVerificationCode,
} from "@/lib/order-verification";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const itemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

const orderSchema = z.object({
  studentName: z.string().trim().min(1, "生徒氏名を入力してください"),
  studentFurigana: z.string().trim().min(1, "生徒氏名のフリガナを入力してください"),
  grade: z.string().trim().min(1, "学年・組を入力してください"),
  guardianName: z.string().trim().min(1, "保護者氏名を入力してください"),
  phone: z.string().trim().min(1, "電話番号を入力してください"),
  email: z.string().trim().email("メールアドレスの形式が正しくありません"),
  note: z.string().trim().optional(),
  nameNote: z.string().trim().optional(),
  items: z.array(itemSchema).min(1, "1点以上選択してください"),
});

export type OrderFormState =
  | { stage: "form"; error?: string }
  | { stage: "verify"; verificationId: string; email: string; error?: string; notice?: string }
  | { stage: "done"; orderId: string };

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 1))}@${domain}`;
}

export async function orderAction(
  schoolSlug: string,
  prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const school = await getSchoolBySlug(schoolSlug);
  if (!school) {
    return { stage: "form", error: "学校が見つかりません" };
  }

  const intent = String(formData.get("intent") ?? "request");

  if (intent === "resend") {
    if (prevState.stage !== "verify") {
      return { stage: "form", error: "もう一度注文内容を入力してください。" };
    }
    const result = await resendOrderVerificationCode(prevState.verificationId, school.name);
    if (!result.ok) {
      return { ...prevState, error: result.error, notice: undefined };
    }
    return { ...prevState, error: undefined, notice: "確認コードを再送信しました。" };
  }

  if (intent === "confirm") {
    if (prevState.stage !== "verify") {
      return { stage: "form", error: "もう一度注文内容を入力してください。" };
    }
    const code = String(formData.get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code)) {
      return { ...prevState, error: "6桁の確認コードを入力してください", notice: undefined };
    }

    const result = await confirmOrderVerification(prevState.verificationId, code);
    if (!result.ok) {
      return { ...prevState, error: result.error, notice: undefined };
    }

    try {
      await sendOrderNotification({
        schoolName: school.name,
        order: result.order,
        ...result.customer,
      });
    } catch (error) {
      console.error("[orderAction] admin notification failed", error);
    }

    return { stage: "done", orderId: result.order.id };
  }

  // intent === "request"：注文内容の初回送信 → 確認コードをメール送信
  const variantIds = formData.getAll("variantId");
  const quantities = formData.getAll("quantity");

  const items = variantIds
    .map((variantId, index) => ({
      variantId: String(variantId),
      quantity: Number(quantities[index] ?? 0),
    }))
    .filter((item) => item.quantity > 0);

  const parsed = orderSchema.safeParse({
    studentName: formData.get("studentName"),
    studentFurigana: formData.get("studentFurigana"),
    grade: formData.get("grade"),
    guardianName: formData.get("guardianName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    note: formData.get("note") ?? undefined,
    nameNote: formData.get("nameNote") ?? undefined,
    items,
  });

  if (!parsed.success) {
    return { stage: "form", error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }

  const nameImageFile = formData.get("nameImage");
  let nameImage: { data: Buffer; contentType: string } | undefined;
  if (nameImageFile instanceof File && nameImageFile.size > 0) {
    if (!nameImageFile.type.startsWith("image/")) {
      return { stage: "form", error: "手書き氏名の画像は画像ファイルを選択してください" };
    }
    if (nameImageFile.size > MAX_IMAGE_BYTES) {
      return { stage: "form", error: "手書き氏名の画像は5MB以下にしてください" };
    }
    nameImage = {
      data: Buffer.from(await nameImageFile.arrayBuffer()),
      contentType: nameImageFile.type,
    };
  }

  try {
    const { verificationId, email } = await createOrderVerification({
      schoolId: school.id,
      schoolName: school.name,
      ...parsed.data,
      nameImage,
    });

    return { stage: "verify", verificationId, email: maskEmail(email) };
  } catch (error) {
    console.error("[orderAction] failed to send verification code", error);
    return {
      stage: "form",
      error: "確認コードの送信に失敗しました。時間をおいて再度お試しください。",
    };
  }
}

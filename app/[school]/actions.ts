"use server";

import { z } from "zod";
import { getSchoolBySlug } from "@/lib/schools";
import { createOrder } from "@/lib/orders";
import { sendOrderNotification } from "@/lib/mailer";

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

export type OrderFormState = {
  ok: boolean;
  error?: string;
  orderId?: string;
};

export async function submitOrder(
  schoolSlug: string,
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const school = await getSchoolBySlug(schoolSlug);
  if (!school) {
    return { ok: false, error: "学校が見つかりません" };
  }

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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }

  try {
    const order = await createOrder({
      schoolId: school.id,
      ...parsed.data,
    });

    await sendOrderNotification({
      schoolName: school.name,
      order,
      studentName: parsed.data.studentName,
      grade: parsed.data.grade,
      guardianName: parsed.data.guardianName,
      phone: parsed.data.phone,
      email: parsed.data.email,
    });

    return { ok: true, orderId: order.id };
  } catch (error) {
    console.error("[submitOrder] failed", error);
    return { ok: false, error: "注文の送信に失敗しました。時間をおいて再度お試しください。" };
  }
}

import nodemailer from "nodemailer";
import type { CreatedOrder } from "./orders";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendOrderNotification(params: {
  schoolName: string;
  order: CreatedOrder;
  studentName: string;
  grade: string;
  guardianName: string;
  phone: string;
  email: string;
}) {
  const to = process.env.ORDER_NOTIFY_TO;
  const transport = getTransport();

  if (!transport || !to) {
    console.warn(
      "[mailer] SMTP or ORDER_NOTIFY_TO is not configured. Skipping email notification for order",
      params.order.id,
    );
    return;
  }

  const itemLines = params.order.items
    .map(
      (item) =>
        `- ${item.productName} (${item.size}) x${item.quantity} = ${(
          item.unitPrice * item.quantity
        ).toLocaleString()}円`,
    )
    .join("\n");

  const text = `${params.schoolName} で新しい注文がありました。

注文ID: ${params.order.id}
生徒氏名: ${params.studentName}
学年・組: ${params.grade}
保護者氏名: ${params.guardianName}
電話番号: ${params.phone}
メールアドレス: ${params.email}

--- 注文内容 ---
${itemLines}

合計: ${params.order.total.toLocaleString()}円
`;

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `[学販] 新規注文 - ${params.schoolName} - ${params.studentName}様`,
    text,
  });
}

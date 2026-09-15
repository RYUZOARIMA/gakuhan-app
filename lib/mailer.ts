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

// いたずら注文防止のため、注文送信前に保護者のメールアドレス宛に確認コードを送る。
// 管理者向け通知（sendOrderNotification）と異なりSMTP未設定時は黙って諦めず、
// 呼び出し元がエラーとして扱えるよう例外を投げる。
export async function sendOrderVerificationCode(params: {
  to: string;
  schoolName: string;
  code: string;
  studentName: string;
}) {
  const transport = getTransport();
  if (!transport) {
    console.error(
      "[mailer] SMTP is not configured. Cannot send verification code to",
      params.to,
    );
    throw new Error("メール送信の設定が完了していません。学校販売担当にご連絡ください。");
  }

  const text = `${params.schoolName} オンライン注文フォームの確認コードです。

生徒氏名: ${params.studentName}
確認コード: ${params.code}

このコードは発行から10分間有効です。注文フォームの画面で入力してください。
このメールにお心当たりがない場合は、そのまま破棄していただいて問題ありません。
`;

  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `[学販] 注文確認コード - ${params.schoolName}`,
    text,
  });
}

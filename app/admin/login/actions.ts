"use server";

import { redirect } from "next/navigation";
import { createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!verifyAdminPassword(password)) {
    return { error: "パスワードが正しくありません" };
  }

  await createAdminSession();
  redirect("/admin/orders");
}

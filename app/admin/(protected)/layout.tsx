import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { logoutAction } from "./actions";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/admin/login");

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <nav className="flex gap-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <Link href="/admin/orders">注文一覧</Link>
          <Link href="/admin/products">商品・価格管理</Link>
          <Link href="/admin/summary">発注集計</Link>
        </nav>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ログアウト
          </button>
        </form>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}

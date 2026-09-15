import Link from "next/link";
import { listSchools } from "@/lib/schools";
import { countOrders, getPurchaseSummary } from "@/lib/orders";
import { PurchaseSummaryTable } from "../purchase-summary-table";

export default async function AdminDeadlinePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const range = from || to ? { from, to } : undefined;

  const schools = await listSchools();
  const schoolsWithData = await Promise.all(
    schools.map(async (school) => ({
      school,
      orderCount: await countOrders(school.id, range),
      rows: await getPurchaseSummary(school.id, range),
    })),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          期限別集計
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          期間を指定すると、その期間に届いた注文件数と商品別の必要数を確認できます。未指定の場合は全期間が対象です。
        </p>
      </div>

      <form
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        method="GET"
      >
        <label className="flex flex-col text-sm text-zinc-700 dark:text-zinc-300">
          開始日
          <input
            type="date"
            name="from"
            defaultValue={from ?? ""}
            className="mt-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col text-sm text-zinc-700 dark:text-zinc-300">
          締切日（この日を含む）
          <input
            type="date"
            name="to"
            defaultValue={to ?? ""}
            className="mt-1 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          絞り込む
        </button>
        {(from || to) && (
          <Link
            href="/admin/deadline"
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            条件をクリア
          </Link>
        )}
      </form>

      {schoolsWithData.map(({ school, orderCount, rows }) => (
        <section key={school.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {school.name}
            </h2>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              この期間の注文件数: {orderCount}件
            </p>
          </div>

          <PurchaseSummaryTable
            rows={rows}
            emptyMessage="この期間の注文はありません。"
          />
        </section>
      ))}
    </div>
  );
}

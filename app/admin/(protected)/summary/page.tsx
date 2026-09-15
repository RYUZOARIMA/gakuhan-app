import { listSchools } from "@/lib/schools";
import { getPurchaseSummary } from "@/lib/orders";
import { PurchaseSummaryTable } from "../purchase-summary-table";

export default async function AdminSummaryPage() {
  const schools = await listSchools();
  const schoolsWithSummary = await Promise.all(
    schools.map(async (school) => ({
      school,
      rows: await getPurchaseSummary(school.id),
    })),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          発注集計
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          全注文を商品・サイズ別に集計した、仕入先への発注に必要な数量の一覧です。
        </p>
      </div>

      {schoolsWithSummary.map(({ school, rows }) => (
        <section key={school.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {school.name}
            </h2>
            <a
              href={`/admin/summary/${school.id}/export`}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              CSVダウンロード
            </a>
          </div>

          <PurchaseSummaryTable
            rows={rows}
            emptyMessage="集計対象の注文がまだありません。"
          />
        </section>
      ))}
    </div>
  );
}

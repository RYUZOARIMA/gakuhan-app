import { listSchools } from "@/lib/schools";
import { getPurchaseSummary } from "@/lib/orders";

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

      {schoolsWithSummary.map(({ school, rows }) => {
        const grandTotal = rows.reduce((sum, r) => sum + r.subtotal, 0);
        const grandQuantity = rows.reduce((sum, r) => sum + r.totalQuantity, 0);

        return (
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

            {rows.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                集計対象の注文がまだありません。
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-zinc-100 text-left text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">カテゴリ</th>
                      <th className="px-3 py-2 font-medium">商品</th>
                      <th className="px-3 py-2 font-medium">サイズ</th>
                      <th className="px-3 py-2 text-right font-medium">単価</th>
                      <th className="px-3 py-2 text-right font-medium">必要数</th>
                      <th className="px-3 py-2 text-right font-medium">小計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-zinc-200 dark:border-zinc-800"
                      >
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                          {row.category}
                        </td>
                        <td className="px-3 py-2 text-zinc-900 dark:text-zinc-50">
                          {row.productName}
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                          {row.size}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                          {row.unitPrice.toLocaleString()}円
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-zinc-50">
                          {row.totalQuantity}
                        </td>
                        <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400">
                          {row.subtotal.toLocaleString()}円
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-300 font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-50">
                      <td className="px-3 py-2" colSpan={4}>
                        合計
                      </td>
                      <td className="px-3 py-2 text-right">{grandQuantity}</td>
                      <td className="px-3 py-2 text-right">
                        {grandTotal.toLocaleString()}円
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

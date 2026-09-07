import { listSchools } from "@/lib/schools";
import { listOrderItems, listOrders } from "@/lib/orders";

export default function AdminOrdersPage() {
  const schools = listSchools();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        注文一覧
      </h1>

      {schools.map((school) => {
        const orders = listOrders(school.id);
        return (
          <section key={school.id} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {school.name}（{orders.length}件）
            </h2>

            {orders.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                注文はまだありません。
              </p>
            )}

            {orders.map((order) => {
              const items = listOrderItems(order.id);
              const total = items.reduce(
                (sum, i) => sum + i.unitPrice * i.quantity,
                0,
              );
              return (
                <div
                  key={order.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-zinc-900 dark:text-zinc-50">
                      {order.studentName} 様（{order.grade}）
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {order.createdAt}
                    </p>
                  </div>
                  {order.hasNameImage && (
                    <a
                      href={`/admin/orders/${order.id}/name-image`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block"
                    >
                      <img
                        src={`/admin/orders/${order.id}/name-image`}
                        alt={`${order.studentName} 様 手書き氏名`}
                        className="h-16 w-auto rounded border border-zinc-300 object-contain dark:border-zinc-700"
                      />
                      <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                        手書き氏名画像（クリックで拡大）
                      </span>
                    </a>
                  )}
                  {order.nameNote && (
                    <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                      氏名の特殊文字について: {order.nameNote}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    保護者: {order.guardianName} / {order.phone} /{" "}
                    {order.email}
                  </p>
                  {order.note && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      備考: {order.note}
                    </p>
                  )}
                  <ul className="mt-3 flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {items.map((item, i) => (
                      <li key={i}>
                        {item.productName}（{item.size}） x{item.quantity} ={" "}
                        {(item.unitPrice * item.quantity).toLocaleString()}円
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-right font-medium text-zinc-900 dark:text-zinc-50">
                    合計 {total.toLocaleString()}円
                  </p>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

import { listAllProducts, listSchools } from "@/lib/schools";
import {
  addProductAction,
  addVariantAction,
  toggleProductActiveAction,
  toggleVariantActiveAction,
  updateVariantPriceAction,
} from "../actions";

export default function AdminProductsPage() {
  const schools = listSchools();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          商品・価格管理
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          販売直前の価格改定はここから反映できます。「公開」を外すと注文フォームに表示されなくなります。
        </p>
      </div>

      {schools.map((school) => {
        const products = listAllProducts(school.id);
        return (
          <section key={school.id} className="flex flex-col gap-4">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {school.name}
            </h2>

            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    [{product.category}] {product.name}
                  </p>
                  <form action={toggleProductActiveAction}>
                    <input type="hidden" name="productId" value={product.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={(!product.active).toString()}
                    />
                    <button
                      type="submit"
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      {product.active ? "公開中（非公開にする）" : "非公開（公開する）"}
                    </button>
                  </form>
                </div>

                <ul className="mt-3 flex flex-col gap-2">
                  {product.variants.map((variant) => (
                    <li
                      key={variant.id}
                      className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-2 text-sm dark:border-zinc-900"
                    >
                      <span className="w-16 text-zinc-700 dark:text-zinc-300">
                        {variant.size}
                      </span>
                      <form
                        action={updateVariantPriceAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="variantId"
                          value={variant.id}
                        />
                        <input
                          type="number"
                          name="price"
                          min={0}
                          defaultValue={variant.price}
                          className="w-24 rounded border border-zinc-300 px-2 py-1 text-right dark:border-zinc-700 dark:bg-zinc-900"
                        />
                        <span className="text-zinc-500">円</span>
                        <button
                          type="submit"
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                        >
                          更新
                        </button>
                      </form>
                      <form action={toggleVariantActiveAction}>
                        <input
                          type="hidden"
                          name="variantId"
                          value={variant.id}
                        />
                        <input
                          type="hidden"
                          name="active"
                          value={(!variant.active).toString()}
                        />
                        <button
                          type="submit"
                          className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          {variant.active ? "公開中" : "非公開"}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>

                <form
                  action={addVariantAction}
                  className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3 text-sm dark:border-zinc-900"
                >
                  <input type="hidden" name="productId" value={product.id} />
                  <input
                    type="text"
                    name="size"
                    placeholder="サイズ (例: 160)"
                    required
                    className="w-28 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <input
                    type="number"
                    name="price"
                    placeholder="価格"
                    min={0}
                    required
                    className="w-24 rounded border border-zinc-300 px-2 py-1 text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <button
                    type="submit"
                    className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    サイズを追加
                  </button>
                </form>
              </div>
            ))}

            <form
              action={addProductAction}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-zinc-300 p-4 text-sm dark:border-zinc-700"
            >
              <input type="hidden" name="schoolId" value={school.id} />
              <input
                type="text"
                name="category"
                placeholder="カテゴリ (例: 制服)"
                required
                className="w-32 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <input
                type="text"
                name="name"
                placeholder="商品名 (例: ネクタイ)"
                required
                className="w-48 rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                新しい商品を追加
              </button>
            </form>
          </section>
        );
      })}
    </div>
  );
}

import { listAllProducts, listSchools } from "@/lib/schools";
import {
  addProductAction,
  addVariantAction,
  deleteProductAction,
  deleteSchoolLogoAction,
  replaceHyugaGakuin2026CatalogAction,
  toggleProductActiveAction,
  toggleVariantActiveAction,
  updateVariantPriceAction,
  uploadSchoolLogoAction,
} from "../actions";
import { DeleteProductButton } from "./delete-product-button";
import { SearchBox, SearchableItem } from "@/app/search-filter";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ deleteError?: string; logoError?: string }>;
}) {
  const { deleteError, logoError } = await searchParams;
  const schools = await listSchools();
  const schoolsWithProducts = await Promise.all(
    schools.map(async (school) => ({
      school,
      products: await listAllProducts(school.id),
    })),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          商品・価格管理
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          販売直前の価格改定はここから反映できます。「公開」を外すと注文フォームに表示されなくなります。
        </p>
        {deleteError && (
          <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {deleteError}
          </p>
        )}
        {logoError && (
          <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            校章のアップロードに失敗しました: {logoError}
          </p>
        )}
      </div>

      <SearchBox placeholder="学校名で検索">
        <div className="mt-6 flex flex-col gap-10">
          {schoolsWithProducts.map(({ school, products }) => (
            <SearchableItem key={school.id} matchText={school.name}>
              <section className="flex flex-col gap-4">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  {school.name}
                </h2>

                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  {school.hasLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/${school.slug}/logo?v=${school.logoVersion}`}
                      alt={`${school.name} 校章`}
                      className="h-16 w-16 shrink-0 rounded border border-zinc-200 object-contain dark:border-zinc-800"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700">
                      未設定
                    </div>
                  )}
                  <form
                    action={uploadSchoolLogoAction}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <input type="hidden" name="schoolId" value={school.id} />
                    <input
                      type="file"
                      name="logo"
                      accept="image/*"
                      required
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    />
                    <button
                      type="submit"
                      className="rounded border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      校章をアップロード
                    </button>
                  </form>
                  {school.hasLogo && (
                    <form action={deleteSchoolLogoAction}>
                      <input type="hidden" name="schoolId" value={school.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        校章を削除
                      </button>
                    </form>
                  )}
                </div>

                {school.slug === "hyuga-gakuin" && (
                  <form
                    action={replaceHyugaGakuin2026CatalogAction}
                    className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950"
                  >
                    <input type="hidden" name="schoolId" value={school.id} />
                    <p className="text-amber-900 dark:text-amber-200">
                      2026年申込用紙の商品構成（トレーニングウェア・靴・カバン 全16品目）に一括で入れ替えます。既存の商品は非公開になり、新しい商品が追加されます（削除はされません）。
                    </p>
                    <button
                      type="submit"
                      className="mt-2 rounded border border-amber-400 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800"
                    >
                      2026年商品リストに一括置き換え
                    </button>
                  </form>
                )}

                {products.map((product) => (
                  <div
                    key={product.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        [{product.category}] {product.name}
                      </p>
                      <div className="flex items-center gap-3">
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
                        {!product.active && (
                          <DeleteProductButton
                            productId={product.id}
                            productName={product.name}
                            action={deleteProductAction}
                          />
                        )}
                      </div>
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
                            <input type="hidden" name="variantId" value={variant.id} />
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
                            <input type="hidden" name="variantId" value={variant.id} />
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
            </SearchableItem>
          ))}
        </div>
      </SearchBox>
    </div>
  );
}

"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroyAdminSession } from "@/lib/admin-auth";
import { pool, schemaReady } from "@/lib/db";
import { setSchoolLogo, deleteSchoolLogo } from "@/lib/schools";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

const MAX_LOGO_BYTES = 3 * 1024 * 1024;

export async function uploadSchoolLogoAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId"));
  const file = formData.get("logo");
  if (!schoolId || !(file instanceof File) || file.size === 0) return;

  if (!file.type.startsWith("image/")) return;
  if (file.size > MAX_LOGO_BYTES) return;

  await setSchoolLogo(schoolId, Buffer.from(await file.arrayBuffer()), file.type);

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/[school]", "page");
}

export async function deleteSchoolLogoAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId"));
  if (!schoolId) return;

  await deleteSchoolLogo(schoolId);

  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/[school]", "page");
}

export async function updateVariantPriceAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  const price = Number(formData.get("price"));
  if (!variantId || !Number.isFinite(price) || price < 0) return;

  await schemaReady;
  await pool.query("UPDATE product_variants SET price = $1 WHERE id = $2", [
    Math.round(price),
    variantId,
  ]);

  revalidatePath("/admin/products");
}

export async function toggleVariantActiveAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  const active = formData.get("active") === "true";
  if (!variantId) return;

  await schemaReady;
  await pool.query("UPDATE product_variants SET active = $1 WHERE id = $2", [
    active ? 1 : 0,
    variantId,
  ]);

  revalidatePath("/admin/products");
}

export async function toggleProductActiveAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const active = formData.get("active") === "true";
  if (!productId) return;

  await schemaReady;
  await pool.query("UPDATE products SET active = $1 WHERE id = $2", [
    active ? 1 : 0,
    productId,
  ]);

  revalidatePath("/admin/products");
}

// 非公開の商品を完全に削除する。注文実績（order_items）があるバリアントを
// 持つ商品はFK違反を避けるため削除せずスキップする。
export async function deleteProductAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const productName = String(formData.get("productName") ?? "この商品");
  if (!productId) return;

  await schemaReady;

  const referenced = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM order_items
     WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = $1)`,
    [productId],
  );
  if ((referenced.rows[0]?.n ?? 0) > 0) {
    redirect(
      `/admin/products?deleteError=${encodeURIComponent(
        `「${productName}」は過去に注文実績があるため削除できません（注文履歴を壊さないための仕様です。表示から隠すには「非公開」のままにしてください）。`,
      )}`,
    );
  }

  await pool.query("DELETE FROM product_variants WHERE product_id = $1", [productId]);
  await pool.query("DELETE FROM products WHERE id = $1", [productId]);

  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function addVariantAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const size = String(formData.get("size") ?? "").trim();
  const price = Number(formData.get("price"));
  if (!productId || !size || !Number.isFinite(price) || price < 0) return;

  await schemaReady;

  const maxSortResult = await pool.query<{ maxsort: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) as maxSort FROM product_variants WHERE product_id = $1",
    [productId],
  );
  const maxSort = maxSortResult.rows[0]?.maxsort ?? -1;

  await pool.query(
    "INSERT INTO product_variants (id, product_id, size, price, sort_order) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), productId, size, Math.round(price), maxSort + 1],
  );

  revalidatePath("/admin/products");
}

// 2026年3月の日向学院販売分：申込用紙の商品構成に合わせて商品を丸ごと入れ替える。
// 既存注文のFK整合性を壊さないよう、旧商品は削除せず非公開化し、新商品を固定IDで追加する
// （ON CONFLICT DO NOTHINGにより再実行しても安全）。
const HYUGA_GAKUIN_2026_PRODUCTS: {
  category: string;
  name: string;
  variants: { size: string; price: number }[];
}[] = [
  {
    category: "トレーニングウェア",
    name: "トレーニングシャツ",
    variants: [
      { size: "S", price: 5700 },
      { size: "M", price: 5700 },
      { size: "L", price: 5700 },
      { size: "LL", price: 5700 },
      { size: "3L", price: 5700 },
      { size: "4L", price: 6200 },
    ],
  },
  {
    category: "トレーニングウェア",
    name: "トレーニングパンツ",
    variants: [
      { size: "S", price: 5100 },
      { size: "M", price: 5100 },
      { size: "L", price: 5100 },
      { size: "LL", price: 5100 },
      { size: "3L", price: 5100 },
      { size: "4L", price: 5600 },
    ],
  },
  {
    category: "トレーニングウェア",
    name: "半袖シャツ",
    variants: [
      { size: "S", price: 4900 },
      { size: "M", price: 4900 },
      { size: "L", price: 4900 },
      { size: "LL", price: 4900 },
      { size: "3L", price: 4900 },
      { size: "4L", price: 5300 },
    ],
  },
  {
    category: "トレーニングウェア",
    name: "ハーフパンツ",
    variants: [
      { size: "S", price: 3800 },
      { size: "M", price: 3800 },
      { size: "L", price: 3800 },
      { size: "LL", price: 3800 },
      { size: "3L", price: 3800 },
      { size: "4L", price: 4300 },
    ],
  },
  {
    category: "トレーニングウェア",
    name: "長袖シャツ",
    variants: [
      { size: "S", price: 5300 },
      { size: "M", price: 5300 },
      { size: "L", price: 5300 },
      { size: "LL", price: 5300 },
      { size: "3L", price: 5300 },
      { size: "4L", price: 5800 },
    ],
  },
  {
    category: "トレーニングウェア",
    name: "体育帽子",
    variants: [{ size: "フリー", price: 1200 }],
  },
  {
    category: "靴",
    name: "男子用ローファー",
    variants: [
      { size: "22.0", price: 5400 },
      { size: "22.5", price: 5400 },
      { size: "23.0", price: 5400 },
      { size: "23.5", price: 5400 },
      { size: "24.0", price: 5400 },
      { size: "24.5", price: 5400 },
      { size: "25.0", price: 5400 },
      { size: "25.5", price: 5400 },
      { size: "26.0", price: 5400 },
      { size: "26.5", price: 5400 },
      { size: "27.0", price: 5400 },
      { size: "27.5", price: 5400 },
      { size: "28.0", price: 5400 },
      { size: "28.5", price: 5400 },
      { size: "29.0", price: 5400 },
    ],
  },
  {
    category: "靴",
    name: "女子用ローファー",
    variants: [
      { size: "22.0", price: 5200 },
      { size: "22.5", price: 5200 },
      { size: "23.0", price: 5200 },
      { size: "23.5", price: 5200 },
      { size: "24.0", price: 5200 },
      { size: "24.5", price: 5200 },
      { size: "25.0", price: 5200 },
      { size: "25.5", price: 5200 },
      { size: "26.0", price: 5200 },
      { size: "26.5", price: 5200 },
      { size: "27.0", price: 5200 },
      { size: "27.5", price: 5200 },
      { size: "28.0", price: 5200 },
      { size: "28.5", price: 5200 },
      { size: "29.0", price: 5200 },
    ],
  },
  {
    category: "靴",
    name: "グランドシューズ",
    variants: [
      { size: "22.0", price: 4200 },
      { size: "22.5", price: 4200 },
      { size: "23.0", price: 4200 },
      { size: "23.5", price: 4200 },
      { size: "24.0", price: 4200 },
      { size: "24.5", price: 4200 },
      { size: "25.0", price: 4200 },
      { size: "25.5", price: 4200 },
      { size: "26.0", price: 4200 },
      { size: "26.5", price: 4200 },
      { size: "27.0", price: 4200 },
      { size: "27.5", price: 4200 },
      { size: "28.0", price: 4200 },
      { size: "28.5", price: 4200 },
      { size: "29.0", price: 4200 },
    ],
  },
  {
    category: "靴",
    name: "体育館シューズ",
    variants: [
      { size: "22.0", price: 4450 },
      { size: "22.5", price: 4450 },
      { size: "23.0", price: 4450 },
      { size: "23.5", price: 4450 },
      { size: "24.0", price: 4450 },
      { size: "24.5", price: 4450 },
      { size: "25.0", price: 4450 },
      { size: "25.5", price: 4450 },
      { size: "26.0", price: 4450 },
      { size: "26.5", price: 4450 },
      { size: "27.0", price: 4450 },
      { size: "27.5", price: 4450 },
      { size: "28.0", price: 4450 },
      { size: "28.5", price: 4450 },
      { size: "29.0", price: 4450 },
    ],
  },
  {
    category: "靴",
    name: "スリッパ",
    variants: [
      { size: "SS", price: 1800 },
      { size: "S", price: 1800 },
      { size: "M", price: 1800 },
      { size: "L", price: 1800 },
      { size: "2L", price: 1800 },
      { size: "3L", price: 1800 },
    ],
  },
  {
    category: "カバン",
    name: "デイパック YC59045",
    variants: [{ size: "フリー", price: 14000 }],
  },
  {
    category: "カバン",
    name: "デイパック YC59052",
    variants: [{ size: "フリー", price: 14000 }],
  },
  {
    category: "カバン",
    name: "デイパック YC59048",
    variants: [{ size: "フリー", price: 14000 }],
  },
  {
    category: "カバン",
    name: "ヘルメット",
    variants: [
      { size: "M", price: 5500 },
      { size: "L", price: 5500 },
    ],
  },
  {
    category: "カバン",
    name: "通学カバン",
    variants: [{ size: "フリー", price: 10800 }],
  },
];

export async function replaceHyugaGakuin2026CatalogAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId"));
  if (!schoolId) return;

  await schemaReady;

  // 旧商品（制服・体操服のプレースホルダー等）を非公開化。削除しないのは、
  // 既存注文のorder_itemsがvariant_idを参照しており、消すとFK違反になるため。
  await pool.query("UPDATE products SET active = 0 WHERE school_id = $1", [schoolId]);
  await pool.query(
    `UPDATE product_variants SET active = 0
     WHERE product_id IN (SELECT id FROM products WHERE school_id = $1)`,
    [schoolId],
  );

  for (const [productIndex, product] of HYUGA_GAKUIN_2026_PRODUCTS.entries()) {
    const productId = `hyuga-2026-product-${productIndex}`;
    await pool.query(
      `INSERT INTO products (id, school_id, category, name, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET category = $3, name = $4, sort_order = $5, active = 1`,
      [productId, schoolId, product.category, product.name, productIndex],
    );

    for (const [variantIndex, variant] of product.variants.entries()) {
      await pool.query(
        `INSERT INTO product_variants (id, product_id, size, price, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET size = $3, price = $4, sort_order = $5, active = 1`,
        [
          `hyuga-2026-variant-${productIndex}-${variantIndex}`,
          productId,
          variant.size,
          variant.price,
          variantIndex,
        ],
      );
    }
  }

  revalidatePath("/admin/products");
}

// テスト注文など不要になった注文を完全に削除する。商品削除と異なり、注文より
// 下流を参照するテーブルがないため確認なしでそのまま削除できる。
export async function deleteOrderAction(formData: FormData) {
  const orderId = String(formData.get("orderId"));
  if (!orderId) return;

  await schemaReady;

  await pool.query("DELETE FROM order_items WHERE order_id = $1", [orderId]);
  await pool.query("DELETE FROM orders WHERE id = $1", [orderId]);

  revalidatePath("/admin/orders");
  revalidatePath("/admin/summary");
  revalidatePath("/admin/deadline");
}

export async function addProductAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId"));
  const category = String(formData.get("category") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!schoolId || !category || !name) return;

  await schemaReady;

  const maxSortResult = await pool.query<{ maxsort: number }>(
    "SELECT COALESCE(MAX(sort_order), -1) as maxSort FROM products WHERE school_id = $1",
    [schoolId],
  );
  const maxSort = maxSortResult.rows[0]?.maxsort ?? -1;

  await pool.query(
    "INSERT INTO products (id, school_id, category, name, sort_order) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), schoolId, category, name, maxSort + 1],
  );

  revalidatePath("/admin/products");
}

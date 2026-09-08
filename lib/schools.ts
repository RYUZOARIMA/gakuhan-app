import { pool, schemaReady } from "./db";

export type School = {
  id: string;
  slug: string;
  name: string;
};

export type ProductVariant = {
  id: string;
  productId: string;
  size: string;
  price: number;
  active: boolean;
  sortOrder: number;
};

export type Product = {
  id: string;
  schoolId: string;
  category: string;
  name: string;
  active: boolean;
  sortOrder: number;
  variants: ProductVariant[];
};

// 3〜4月の販売直前で商品・価格が変わる可能性があるため、
// ここには初回起動時のプレースホルダーだけを置き、実データは管理画面で編集する想定。
const SEED_SCHOOL = { slug: "hyuga-gakuin", name: "日向学院" };

const SEED_PRODUCTS: {
  category: string;
  name: string;
  variants: { size: string; price: number }[];
}[] = [
  {
    category: "制服",
    name: "上着（ブレザー）",
    variants: [
      { size: "150", price: 15000 },
      { size: "160", price: 15000 },
      { size: "170", price: 16000 },
    ],
  },
  {
    category: "制服",
    name: "スラックス",
    variants: [
      { size: "S", price: 8000 },
      { size: "M", price: 8000 },
      { size: "L", price: 8500 },
    ],
  },
  {
    category: "制服",
    name: "スカート",
    variants: [
      { size: "S", price: 8000 },
      { size: "M", price: 8000 },
      { size: "L", price: 8500 },
    ],
  },
  {
    category: "体操服",
    name: "半袖シャツ",
    variants: [
      { size: "150", price: 3000 },
      { size: "160", price: 3000 },
      { size: "170", price: 3200 },
    ],
  },
  {
    category: "体操服",
    name: "長袖シャツ",
    variants: [
      { size: "150", price: 3500 },
      { size: "160", price: 3500 },
      { size: "170", price: 3700 },
    ],
  },
  {
    category: "体操服",
    name: "短パン",
    variants: [
      { size: "S", price: 2500 },
      { size: "M", price: 2500 },
      { size: "L", price: 2700 },
    ],
  },
];

async function seedIfEmpty() {
  const existing = await pool.query("SELECT id FROM schools WHERE slug = $1", [
    SEED_SCHOOL.slug,
  ]);
  if (existing.rows.length > 0) return;

  // 複数インスタンス間でも商品/バリアントIDが一致するよう固定IDでシードする。
  const schoolId = `seed-school-${SEED_SCHOOL.slug}`;
  await pool.query(
    "INSERT INTO schools (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
    [schoolId, SEED_SCHOOL.slug, SEED_SCHOOL.name],
  );

  for (const [productIndex, product] of SEED_PRODUCTS.entries()) {
    const productId = `seed-product-${productIndex}`;
    await pool.query(
      `INSERT INTO products (id, school_id, category, name, sort_order)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [productId, schoolId, product.category, product.name, productIndex],
    );

    for (const [variantIndex, variant] of product.variants.entries()) {
      await pool.query(
        `INSERT INTO product_variants (id, product_id, size, price, sort_order)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
        [
          `seed-variant-${productIndex}-${variantIndex}`,
          productId,
          variant.size,
          variant.price,
          variantIndex,
        ],
      );
    }
  }
}

const ready = schemaReady.then(() => seedIfEmpty());

export function getSchoolBySlug(slug: string): Promise<School | undefined> {
  return ready.then(async () => {
    const result = await pool.query<School>(
      "SELECT id, slug, name FROM schools WHERE slug = $1",
      [slug],
    );
    return result.rows[0];
  });
}

export function listSchools(): Promise<School[]> {
  return ready.then(async () => {
    const result = await pool.query<School>("SELECT id, slug, name FROM schools");
    return result.rows;
  });
}

type ProductRow = {
  id: string;
  schoolid: string;
  category: string;
  name: string;
  active: number;
  sortorder: number;
};

type VariantRow = {
  id: string;
  productid: string;
  size: string;
  price: number;
  active: number;
  sortorder: number;
};

async function attachVariants(
  productRows: ProductRow[],
  activeOnly: boolean,
): Promise<Product[]> {
  const products: Product[] = [];
  for (const row of productRows) {
    const variantResult = activeOnly
      ? await pool.query<VariantRow>(
          `SELECT id, product_id as productId, size, price, active, sort_order as sortOrder
           FROM product_variants WHERE product_id = $1 AND active = 1
           ORDER BY sort_order`,
          [row.id],
        )
      : await pool.query<VariantRow>(
          `SELECT id, product_id as productId, size, price, active, sort_order as sortOrder
           FROM product_variants WHERE product_id = $1
           ORDER BY sort_order`,
          [row.id],
        );

    products.push({
      id: row.id,
      schoolId: row.schoolid,
      category: row.category,
      name: row.name,
      active: Boolean(row.active),
      sortOrder: row.sortorder,
      variants: variantResult.rows.map((v) => ({
        id: v.id,
        productId: v.productid,
        size: v.size,
        price: v.price,
        active: Boolean(v.active),
        sortOrder: v.sortorder,
      })),
    });
  }
  return products;
}

export function listActiveProducts(schoolId: string): Promise<Product[]> {
  return ready.then(async () => {
    const productResult = await pool.query<ProductRow>(
      `SELECT id, school_id as schoolId, category, name, active, sort_order as sortOrder
       FROM products WHERE school_id = $1 AND active = 1
       ORDER BY sort_order`,
      [schoolId],
    );
    return attachVariants(productResult.rows, true);
  });
}

// 管理画面用：非公開(active=0)の商品・サイズも含めて全件取得する
export function listAllProducts(schoolId: string): Promise<Product[]> {
  return ready.then(async () => {
    const productResult = await pool.query<ProductRow>(
      `SELECT id, school_id as schoolId, category, name, active, sort_order as sortOrder
       FROM products WHERE school_id = $1
       ORDER BY sort_order`,
      [schoolId],
    );
    return attachVariants(productResult.rows, false);
  });
}

export function getVariantById(variantId: string) {
  return ready.then(async () => {
    const result = await pool.query<{
      id: string;
      productid: string;
      size: string;
      price: number;
      productname: string;
    }>(
      `SELECT pv.id, pv.product_id as productId, pv.size, pv.price, p.name as productName
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id = $1`,
      [variantId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      productId: row.productid,
      size: row.size,
      price: row.price,
      productName: row.productname,
    };
  });
}

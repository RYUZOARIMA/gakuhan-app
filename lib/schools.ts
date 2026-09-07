import { db } from "./db";

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

function seedIfEmpty() {
  const existing = db
    .prepare("SELECT id FROM schools WHERE slug = ?")
    .get(SEED_SCHOOL.slug) as { id: string } | undefined;
  if (existing) return;

  // サーバーレス環境ではインスタンスごとに独立したDBが作られうるため、
  // 複数インスタンス間でも商品/バリアントIDが一致するよう固定IDでシードする。
  const schoolId = `seed-school-${SEED_SCHOOL.slug}`;
  db.prepare("INSERT INTO schools (id, slug, name) VALUES (?, ?, ?)").run(
    schoolId,
    SEED_SCHOOL.slug,
    SEED_SCHOOL.name,
  );

  const insertProduct = db.prepare(
    "INSERT INTO products (id, school_id, category, name, sort_order) VALUES (?, ?, ?, ?, ?)",
  );
  const insertVariant = db.prepare(
    "INSERT INTO product_variants (id, product_id, size, price, sort_order) VALUES (?, ?, ?, ?, ?)",
  );

  SEED_PRODUCTS.forEach((product, productIndex) => {
    const productId = `seed-product-${productIndex}`;
    insertProduct.run(
      productId,
      schoolId,
      product.category,
      product.name,
      productIndex,
    );
    product.variants.forEach((variant, variantIndex) => {
      insertVariant.run(
        `seed-variant-${productIndex}-${variantIndex}`,
        productId,
        variant.size,
        variant.price,
        variantIndex,
      );
    });
  });
}

seedIfEmpty();

export function getSchoolBySlug(slug: string): School | undefined {
  const row = db
    .prepare("SELECT id, slug, name FROM schools WHERE slug = ?")
    .get(slug) as School | undefined;
  return row;
}

export function listSchools(): School[] {
  return db.prepare("SELECT id, slug, name FROM schools").all() as School[];
}

type ProductRow = {
  id: string;
  schoolId: string;
  category: string;
  name: string;
  active: number;
  sortOrder: number;
};

export function listActiveProducts(schoolId: string): Product[] {
  const productRows = db
    .prepare(
      `SELECT id, school_id as schoolId, category, name, active, sort_order as sortOrder
       FROM products WHERE school_id = ? AND active = 1
       ORDER BY sort_order`,
    )
    .all(schoolId) as ProductRow[];

  const variantStmt = db.prepare(
    `SELECT id, product_id as productId, size, price, active, sort_order as sortOrder
     FROM product_variants WHERE product_id = ? AND active = 1
     ORDER BY sort_order`,
  );

  return productRows.map((row) => ({
    id: row.id,
    schoolId: row.schoolId,
    category: row.category,
    name: row.name,
    active: Boolean(row.active),
    sortOrder: row.sortOrder,
    variants: (
      variantStmt.all(row.id) as {
        id: string;
        productId: string;
        size: string;
        price: number;
        active: number;
        sortOrder: number;
      }[]
    ).map((v) => ({ ...v, active: Boolean(v.active) })),
  }));
}

// 管理画面用：非公開(active=0)の商品・サイズも含めて全件取得する
export function listAllProducts(schoolId: string): Product[] {
  const productRows = db
    .prepare(
      `SELECT id, school_id as schoolId, category, name, active, sort_order as sortOrder
       FROM products WHERE school_id = ?
       ORDER BY sort_order`,
    )
    .all(schoolId) as ProductRow[];

  const variantStmt = db.prepare(
    `SELECT id, product_id as productId, size, price, active, sort_order as sortOrder
     FROM product_variants WHERE product_id = ?
     ORDER BY sort_order`,
  );

  return productRows.map((row) => ({
    id: row.id,
    schoolId: row.schoolId,
    category: row.category,
    name: row.name,
    active: Boolean(row.active),
    sortOrder: row.sortOrder,
    variants: (
      variantStmt.all(row.id) as {
        id: string;
        productId: string;
        size: string;
        price: number;
        active: number;
        sortOrder: number;
      }[]
    ).map((v) => ({ ...v, active: Boolean(v.active) })),
  }));
}

export function getVariantById(variantId: string) {
  return db
    .prepare(
      `SELECT pv.id, pv.product_id as productId, pv.size, pv.price, p.name as productName
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE pv.id = ?`,
    )
    .get(variantId) as
    | { id: string; productId: string; size: string; price: number; productName: string }
    | undefined;
}

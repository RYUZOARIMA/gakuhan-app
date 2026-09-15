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
const SEED_SCHOOLS: {
  slug: string;
  name: string;
  products: {
    category: string;
    name: string;
    variants: { size: string; price: number }[];
  }[];
}[] = [
  {
    slug: "hyuga-gakuin",
    name: "日向学院",
    products: [
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
        variants: [{ size: "フリー", price: 5400 }],
      },
      {
        category: "靴",
        name: "女子用ローファー",
        variants: [{ size: "フリー", price: 5200 }],
      },
      {
        category: "靴",
        name: "グランドシューズ",
        variants: [{ size: "フリー", price: 4200 }],
      },
      {
        category: "靴",
        name: "体育館シューズ",
        variants: [{ size: "フリー", price: 4450 }],
      },
      {
        category: "靴",
        name: "スリッパ",
        variants: [{ size: "フリー", price: 1800 }],
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
        variants: [{ size: "フリー", price: 5500 }],
      },
      {
        category: "カバン",
        name: "通学カバン",
        variants: [{ size: "フリー", price: 10800 }],
      },
    ],
  },
  {
    slug: "nissho-gakuen-soccer",
    name: "日章学園サッカー部",
    products: [
      {
        category: "ユニフォーム",
        name: "ゲームシャツ",
        variants: [
          { size: "S", price: 6000 },
          { size: "M", price: 6000 },
          { size: "L", price: 6000 },
          { size: "LL", price: 6500 },
        ],
      },
      {
        category: "ユニフォーム",
        name: "ゲームパンツ",
        variants: [
          { size: "S", price: 4000 },
          { size: "M", price: 4000 },
          { size: "L", price: 4000 },
          { size: "LL", price: 4500 },
        ],
      },
      {
        category: "ユニフォーム",
        name: "ストッキング",
        variants: [
          { size: "S", price: 1500 },
          { size: "M", price: 1500 },
          { size: "L", price: 1500 },
        ],
      },
      {
        category: "トレーニングウェア",
        name: "プラクティスシャツ（半袖）",
        variants: [
          { size: "S", price: 3000 },
          { size: "M", price: 3000 },
          { size: "L", price: 3000 },
          { size: "LL", price: 3300 },
        ],
      },
      {
        category: "トレーニングウェア",
        name: "ロングパンツ",
        variants: [
          { size: "S", price: 3500 },
          { size: "M", price: 3500 },
          { size: "L", price: 3500 },
          { size: "LL", price: 3800 },
        ],
      },
      {
        category: "トレーニングウェア",
        name: "ウィンドブレーカー（上下）",
        variants: [
          { size: "S", price: 8000 },
          { size: "M", price: 8000 },
          { size: "L", price: 8000 },
          { size: "LL", price: 8500 },
        ],
      },
      {
        category: "グッズ",
        name: "エコバッグ",
        variants: [{ size: "フリー", price: 1500 }],
      },
      {
        category: "グッズ",
        name: "チームタオル",
        variants: [{ size: "フリー", price: 1200 }],
      },
    ],
  },
];

async function ensureSeedData() {
  // 学校が既にあっても打ち切らない: ビルド中断等で商品の途中までしか
  // 投入されなかった場合に備え、常に不足分を補充できるようにする
  // (各INSERTはON CONFLICT DO NOTHINGで冪等)。

  // 複数インスタンス間でも商品/バリアントIDが一致するよう固定IDでシードする。
  for (const seedSchool of SEED_SCHOOLS) {
    const schoolId = `seed-school-${seedSchool.slug}`;
    await pool.query(
      "INSERT INTO schools (id, slug, name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
      [schoolId, seedSchool.slug, seedSchool.name],
    );

    for (const [productIndex, product] of seedSchool.products.entries()) {
      const productId = `seed-product-${seedSchool.slug}-${productIndex}`;
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
            `seed-variant-${seedSchool.slug}-${productIndex}-${variantIndex}`,
            productId,
            variant.size,
            variant.price,
            variantIndex,
          ],
        );
      }
    }
  }
}

// schemaReadyと同様、失敗をそのままキャッシュすると復旧するまでこのインスタンスへの
// 全リクエストが失敗し続けるため、reject時は次回呼び出しで再試行できるようにする。
function createReady(): Promise<void> {
  return schemaReady.then(() => ensureSeedData()).catch((err) => {
    ready = createReady();
    throw err;
  });
}

let ready = createReady();

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

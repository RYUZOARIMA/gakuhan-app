import { randomUUID } from "node:crypto";
import { pool, schemaReady } from "./db";

export type OrderItemInput = {
  variantId: string;
  quantity: number;
};

export type NameImageInput = {
  data: Buffer;
  contentType: string;
};

export type OrderInput = {
  schoolId: string;
  studentName: string;
  studentFurigana: string;
  grade: string;
  guardianName: string;
  phone: string;
  email: string;
  note?: string;
  nameNote?: string;
  nameImage?: NameImageInput;
  items: OrderItemInput[];
};

export type CreatedOrderItem = {
  productName: string;
  size: string;
  unitPrice: number;
  quantity: number;
};

export type CreatedOrder = {
  id: string;
  createdAt: string;
  items: CreatedOrderItem[];
  total: number;
};

export async function createOrder(input: OrderInput): Promise<CreatedOrder> {
  await schemaReady;
  const orderId = randomUUID();
  const items: CreatedOrderItem[] = [];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO orders
         (id, school_id, student_name, student_furigana, grade, guardian_name, phone, email, note, name_note, name_image, name_image_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        orderId,
        input.schoolId,
        input.studentName,
        input.studentFurigana,
        input.grade,
        input.guardianName,
        input.phone,
        input.email,
        input.note ?? null,
        input.nameNote ?? null,
        input.nameImage?.data ?? null,
        input.nameImage?.contentType ?? null,
      ],
    );

    for (const item of input.items) {
      if (item.quantity < 1) {
        throw new Error("数量は1以上を指定してください");
      }

      const variantResult = await client.query<{
        id: string;
        price: number;
        size: string;
        productname: string;
      }>(
        `SELECT pv.id, pv.price, pv.size, p.name as productName
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE pv.id = $1 AND pv.active = 1`,
        [item.variantId],
      );
      const variant = variantResult.rows[0];
      if (!variant) {
        throw new Error(`商品が見つかりません: ${item.variantId}`);
      }

      await client.query(
        `INSERT INTO order_items (id, order_id, variant_id, product_name, size, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          randomUUID(),
          orderId,
          variant.id,
          variant.productname,
          variant.size,
          variant.price,
          item.quantity,
        ],
      );

      items.push({
        productName: variant.productname,
        size: variant.size,
        unitPrice: variant.price,
        quantity: item.quantity,
      });
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return {
    id: orderId,
    createdAt: new Date().toISOString(),
    items,
    total: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
  };
}

export type OrderRow = {
  id: string;
  schoolId: string;
  studentName: string;
  studentFurigana: string;
  grade: string;
  guardianName: string;
  phone: string;
  email: string;
  note: string | null;
  nameNote: string | null;
  hasNameImage: boolean;
  status: string;
  createdAt: string;
};

type OrderRowRaw = {
  id: string;
  schoolid: string;
  studentname: string;
  studentfurigana: string;
  grade: string;
  guardianname: string;
  phone: string;
  email: string;
  note: string | null;
  namenote: string | null;
  hasnameimage: boolean;
  status: string;
  createdat: string;
};

export async function listOrders(schoolId: string): Promise<OrderRow[]> {
  await schemaReady;
  const result = await pool.query<OrderRowRaw>(
    `SELECT id, school_id as schoolId, student_name as studentName,
            student_furigana as studentFurigana, grade,
            guardian_name as guardianName, phone, email, note, status,
            created_at::text as createdAt,
            name_note as nameNote,
            (name_image IS NOT NULL) as hasNameImage
     FROM orders WHERE school_id = $1 ORDER BY created_at DESC`,
    [schoolId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    schoolId: row.schoolid,
    studentName: row.studentname,
    studentFurigana: row.studentfurigana,
    grade: row.grade,
    guardianName: row.guardianname,
    phone: row.phone,
    email: row.email,
    note: row.note,
    nameNote: row.namenote,
    hasNameImage: row.hasnameimage,
    status: row.status,
    createdAt: row.createdat,
  }));
}

export async function getOrderNameImage(
  orderId: string,
): Promise<NameImageInput | undefined> {
  await schemaReady;
  const result = await pool.query<{ data: Buffer; contenttype: string }>(
    `SELECT name_image as data, name_image_type as contentType
     FROM orders WHERE id = $1 AND name_image IS NOT NULL`,
    [orderId],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return { data: row.data, contentType: row.contenttype };
}

type OrderItemRowRaw = {
  productname: string;
  size: string;
  unitprice: number;
  quantity: number;
};

export async function listOrderItems(orderId: string): Promise<CreatedOrderItem[]> {
  await schemaReady;
  const result = await pool.query<OrderItemRowRaw>(
    `SELECT product_name as productName, size, unit_price as unitPrice, quantity
     FROM order_items WHERE order_id = $1`,
    [orderId],
  );
  return result.rows.map((row) => ({
    productName: row.productname,
    size: row.size,
    unitPrice: row.unitprice,
    quantity: row.quantity,
  }));
}

export type PurchaseSummaryRow = {
  category: string;
  productName: string;
  size: string;
  unitPrice: number;
  totalQuantity: number;
  subtotal: number;
};

type PurchaseSummaryRowRaw = {
  category: string | null;
  productname: string;
  size: string;
  unitprice: number;
  totalquantity: string;
};

export async function getPurchaseSummary(schoolId: string): Promise<PurchaseSummaryRow[]> {
  await schemaReady;
  const result = await pool.query<PurchaseSummaryRowRaw>(
    `SELECT p.category as category, oi.product_name as productName, oi.size as size,
            oi.unit_price as unitPrice, SUM(oi.quantity) as totalQuantity
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     LEFT JOIN products p ON p.name = oi.product_name AND p.school_id = o.school_id
     WHERE o.school_id = $1
     GROUP BY p.category, oi.product_name, oi.size, oi.unit_price, p.sort_order
     ORDER BY p.sort_order, oi.product_name, oi.size`,
    [schoolId],
  );

  return result.rows.map((row) => {
    const totalQuantity = Number(row.totalquantity);
    return {
      category: row.category ?? "その他",
      productName: row.productname,
      size: row.size,
      unitPrice: row.unitprice,
      totalQuantity,
      subtotal: row.unitprice * totalQuantity,
    };
  });
}

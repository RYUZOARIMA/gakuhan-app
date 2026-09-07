import { randomUUID } from "node:crypto";
import { db } from "./db";

export type OrderItemInput = {
  variantId: string;
  quantity: number;
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
  items: OrderItemInput[];
  nameNote?: string;
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

export function createOrder(input: OrderInput): CreatedOrder {
  const orderId = randomUUID();

  const getVariant = db.prepare(
    `SELECT pv.id, pv.price, pv.size, p.name as productName
     FROM product_variants pv
     JOIN products p ON p.id = pv.product_id
     WHERE pv.id = ? AND pv.active = 1`,
  );

  const insertOrder = db.prepare(
    `INSERT INTO orders (id, school_id, student_name, student_furigana, grade, guardian_name, phone, email, note, name_note)
     VALUES (@id, @schoolId, @studentName, @studentFurigana, @grade, @guardianName, @phone, @email, @note, @nameNote)`,
  );

  const insertItem = db.prepare(
    `INSERT INTO order_items (id, order_id, variant_id, product_name, size, unit_price, quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const items: CreatedOrderItem[] = [];

  const run = db.transaction(() => {
    insertOrder.run({
      id: orderId,
      schoolId: input.schoolId,
      studentName: input.studentName,
      studentFurigana: input.studentFurigana,
      grade: input.grade,
      guardianName: input.guardianName,
      phone: input.phone,
      email: input.email,
      note: input.note ?? null,
      nameNote: input.nameNote ?? null,
    });

    for (const item of input.items) {
      const variant = getVariant.get(item.variantId) as
        | { id: string; price: number; size: string; productName: string }
        | undefined;
      if (!variant) {
        throw new Error(`商品が見つかりません: ${item.variantId}`);
      }
      if (item.quantity < 1) {
        throw new Error("数量は1以上を指定してください");
      }

      insertItem.run(
        randomUUID(),
        orderId,
        variant.id,
        variant.productName,
        variant.size,
        variant.price,
        item.quantity,
      );

      items.push({
        productName: variant.productName,
        size: variant.size,
        unitPrice: variant.price,
        quantity: item.quantity,
      });
    }
  });

  run();

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
  status: string;
  createdAt: string;
  nameNote: string | null;
};

export function listOrders(schoolId: string): OrderRow[] {
  return db
    .prepare(
      `SELECT id, school_id as schoolId, student_name as studentName,
              student_furigana as studentFurigana, grade,
              guardian_name as guardianName, phone, email, note, status,
              created_at as createdAt,
              name_note as nameNote
       FROM orders WHERE school_id = ? ORDER BY created_at DESC`,
    )
    .all(schoolId) as OrderRow[];
}

export function listOrderItems(orderId: string): CreatedOrderItem[] {
  return db
    .prepare(
      `SELECT product_name as productName, size, unit_price as unitPrice, quantity
       FROM order_items WHERE order_id = ?`,
    )
    .all(orderId) as CreatedOrderItem[];
}

export type PurchaseSummaryRow = {
  category: string;
  productName: string;
  size: string;
  unitPrice: number;
  totalQuantity: number;
  subtotal: number;
};

export function getPurchaseSummary(schoolId: string): PurchaseSummaryRow[] {
  const rows = db
    .prepare(
      `SELECT p.category as category, oi.product_name as productName, oi.size as size,
              oi.unit_price as unitPrice, SUM(oi.quantity) as totalQuantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.name = oi.product_name AND p.school_id = o.school_id
       WHERE o.school_id = ?
       GROUP BY p.category, oi.product_name, oi.size, oi.unit_price
       ORDER BY p.sort_order, oi.product_name, oi.size`,
    )
    .all(schoolId) as {
    category: string | null;
    productName: string;
    size: string;
    unitPrice: number;
    totalQuantity: number;
  }[];

  return rows.map((row) => ({
    category: row.category ?? "その他",
    productName: row.productName,
    size: row.size,
    unitPrice: row.unitPrice,
    totalQuantity: row.totalQuantity,
    subtotal: row.unitPrice * row.totalQuantity,
  }));
}

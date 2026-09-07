import { randomUUID } from "node:crypto";
import { db } from "./db";

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
  grade: string;
  guardianName: string;
  phone: string;
  email: string;
  note?: string;
  items: OrderItemInput[];
  nameImage?: NameImageInput;
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
    `INSERT INTO orders (id, school_id, student_name, grade, guardian_name, phone, email, note, name_image, name_image_type)
     VALUES (@id, @schoolId, @studentName, @grade, @guardianName, @phone, @email, @note, @nameImage, @nameImageType)`,
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
      grade: input.grade,
      guardianName: input.guardianName,
      phone: input.phone,
      email: input.email,
      note: input.note ?? null,
      nameImage: input.nameImage?.data ?? null,
      nameImageType: input.nameImage?.contentType ?? null,
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
  grade: string;
  guardianName: string;
  phone: string;
  email: string;
  note: string | null;
  status: string;
  createdAt: string;
  hasNameImage: boolean;
};

export function listOrders(schoolId: string): OrderRow[] {
  const rows = db
    .prepare(
      `SELECT id, school_id as schoolId, student_name as studentName, grade,
              guardian_name as guardianName, phone, email, note, status,
              created_at as createdAt,
              (name_image IS NOT NULL) as hasNameImage
       FROM orders WHERE school_id = ? ORDER BY created_at DESC`,
    )
    .all(schoolId) as (Omit<OrderRow, "hasNameImage"> & {
    hasNameImage: number;
  })[];

  return rows.map((row) => ({ ...row, hasNameImage: Boolean(row.hasNameImage) }));
}

export function listOrderItems(orderId: string): CreatedOrderItem[] {
  return db
    .prepare(
      `SELECT product_name as productName, size, unit_price as unitPrice, quantity
       FROM order_items WHERE order_id = ?`,
    )
    .all(orderId) as CreatedOrderItem[];
}

export function getOrderNameImage(orderId: string): NameImageInput | undefined {
  const row = db
    .prepare(
      `SELECT name_image as data, name_image_type as contentType
       FROM orders WHERE id = ? AND name_image IS NOT NULL`,
    )
    .get(orderId) as { data: Buffer; contentType: string } | undefined;
  if (!row) return undefined;
  return { data: row.data, contentType: row.contentType };
}

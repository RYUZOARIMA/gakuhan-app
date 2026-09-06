"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroyAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function updateVariantPriceAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  const price = Number(formData.get("price"));
  if (!variantId || !Number.isFinite(price) || price < 0) return;

  db.prepare("UPDATE product_variants SET price = ? WHERE id = ?").run(
    Math.round(price),
    variantId,
  );

  revalidatePath("/admin/products");
}

export async function toggleVariantActiveAction(formData: FormData) {
  const variantId = String(formData.get("variantId"));
  const active = formData.get("active") === "true";
  if (!variantId) return;

  db.prepare("UPDATE product_variants SET active = ? WHERE id = ?").run(
    active ? 1 : 0,
    variantId,
  );

  revalidatePath("/admin/products");
}

export async function toggleProductActiveAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const active = formData.get("active") === "true";
  if (!productId) return;

  db.prepare("UPDATE products SET active = ? WHERE id = ?").run(
    active ? 1 : 0,
    productId,
  );

  revalidatePath("/admin/products");
}

export async function addVariantAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const size = String(formData.get("size") ?? "").trim();
  const price = Number(formData.get("price"));
  if (!productId || !size || !Number.isFinite(price) || price < 0) return;

  const maxSort = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as maxSort FROM product_variants WHERE product_id = ?",
    )
    .get(productId) as { maxSort: number };

  db.prepare(
    "INSERT INTO product_variants (id, product_id, size, price, sort_order) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), productId, size, Math.round(price), maxSort.maxSort + 1);

  revalidatePath("/admin/products");
}

export async function addProductAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId"));
  const category = String(formData.get("category") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!schoolId || !category || !name) return;

  const maxSort = db
    .prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as maxSort FROM products WHERE school_id = ?",
    )
    .get(schoolId) as { maxSort: number };

  db.prepare(
    "INSERT INTO products (id, school_id, category, name, sort_order) VALUES (?, ?, ?, ?, ?)",
  ).run(randomUUID(), schoolId, category, name, maxSort.maxSort + 1);

  revalidatePath("/admin/products");
}

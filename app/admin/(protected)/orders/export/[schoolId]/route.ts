import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listOrderItems, listOrders } from "@/lib/orders";
import { listAllProducts, listSchools } from "@/lib/schools";

function escapeCsvField(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { schoolId } = await params;
  const schools = await listSchools();
  const school = schools.find((s) => s.id === schoolId);
  if (!school) {
    return new Response("Not found", { status: 404 });
  }

  const orders = await listOrders(schoolId);
  const products = await listAllProducts(schoolId);

  // 商品を列にする(1商品=1列)。列順はまず現在のカタログのsort_order順、
  // 商品名変更・削除等で現カタログにない過去の商品名は末尾に追加し、
  // 過去の注文データが列から漏れないようにする。
  const productColumns: string[] = [];
  const seenProductNames = new Set<string>();
  for (const product of products) {
    if (!seenProductNames.has(product.name)) {
      seenProductNames.add(product.name);
      productColumns.push(product.name);
    }
  }

  const orderItems = await Promise.all(
    orders.map((order) => listOrderItems(order.id)),
  );
  for (const items of orderItems) {
    for (const item of items) {
      if (!seenProductNames.has(item.productName)) {
        seenProductNames.add(item.productName);
        productColumns.push(item.productName);
      }
    }
  }

  const header = ["日時", "注文者", ...productColumns, "総額"];
  const lines = [header.join(",")];

  orders.forEach((order, i) => {
    const items = orderItems[i];
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    const productCells = productColumns.map((productName) => {
      const matching = items.filter((item) => item.productName === productName);
      return matching.map((item) => `${item.size}×${item.quantity}`).join(" / ");
    });

    lines.push(
      [
        escapeCsvField(order.createdAt),
        escapeCsvField(order.guardianName),
        ...productCells.map(escapeCsvField),
        escapeCsvField(total),
      ].join(","),
    );
  });

  // Excelでの文字化けを防ぐためUTF-8 BOMを付与
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${school.slug}_orders.csv"`,
    },
  });
}

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listOrderItems, listOrders } from "@/lib/orders";
import { listSchools } from "@/lib/schools";

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

  const header = ["日時", "注文者", "注文内容", "総額"];
  const lines = [header.join(",")];

  for (const order of orders) {
    const items = await listOrderItems(order.id);
    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const itemsText = items
      .map((item) => `${item.productName}(${item.size})×${item.quantity}`)
      .join(" / ");

    lines.push(
      [
        escapeCsvField(order.createdAt),
        escapeCsvField(order.guardianName),
        escapeCsvField(itemsText),
        escapeCsvField(total),
      ].join(","),
    );
  }

  // Excelでの文字化けを防ぐためUTF-8 BOMを付与
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${school.slug}_orders.csv"`,
    },
  });
}

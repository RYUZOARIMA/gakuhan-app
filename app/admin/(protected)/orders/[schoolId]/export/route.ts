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

  const header = [
    "注文日時",
    "生徒氏名",
    "フリガナ",
    "学年・組",
    "保護者氏名",
    "電話番号",
    "メールアドレス",
    "商品",
    "サイズ",
    "単価",
    "数量",
    "小計",
    "備考",
    "氏名の特殊文字について",
  ];
  const lines = [header.join(",")];

  for (const order of orders) {
    const items = await listOrderItems(order.id);
    for (const item of items) {
      lines.push(
        [
          escapeCsvField(order.createdAt),
          escapeCsvField(order.studentName),
          escapeCsvField(order.studentFurigana),
          escapeCsvField(order.grade),
          escapeCsvField(order.guardianName),
          escapeCsvField(order.phone),
          escapeCsvField(order.email),
          escapeCsvField(item.productName),
          escapeCsvField(item.size),
          escapeCsvField(item.unitPrice),
          escapeCsvField(item.quantity),
          escapeCsvField(item.unitPrice * item.quantity),
          escapeCsvField(order.note ?? ""),
          escapeCsvField(order.nameNote ?? ""),
        ].join(","),
      );
    }
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

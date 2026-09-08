import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPurchaseSummary } from "@/lib/orders";
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

  const rows = await getPurchaseSummary(schoolId);

  const header = ["カテゴリ", "商品", "サイズ", "単価", "必要数", "小計"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        escapeCsvField(row.category),
        escapeCsvField(row.productName),
        escapeCsvField(row.size),
        escapeCsvField(row.unitPrice),
        escapeCsvField(row.totalQuantity),
        escapeCsvField(row.subtotal),
      ].join(","),
    );
  }

  // Excelでの文字化けを防ぐためUTF-8 BOMを付与
  const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${school.slug}_purchase_summary.csv"`,
    },
  });
}

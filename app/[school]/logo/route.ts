import { getSchoolBySlug, getSchoolLogo } from "@/lib/schools";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ school: string }> },
) {
  const { school: slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) {
    return new Response("Not found", { status: 404 });
  }

  const logo = await getSchoolLogo(school.id);
  if (!logo) {
    return new Response("Not found", { status: 404 });
  }

  // 長めのpublicキャッシュにしていると、差し替え後もVercelのエッジやブラウザに
  // 古い画像が残り続けて「アップロードしたのに前のファイルが表示される」状態に
  // なるため、毎回最新のDBの内容を返すようにする（校章は小さい画像かつ
  // アクセス頻度もそこまで高くないため、キャッシュなしで問題ない）。
  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "no-store",
    },
  });
}

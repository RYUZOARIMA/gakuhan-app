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

  return new Response(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

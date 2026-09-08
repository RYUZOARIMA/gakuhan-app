import { notFound } from "next/navigation";
import { getSchoolBySlug, listActiveProducts } from "@/lib/schools";
import { OrderForm } from "./order-form";
import { submitOrder } from "./actions";

export default async function SchoolOrderPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolSlug } = await params;
  const school = await getSchoolBySlug(schoolSlug);
  if (!school) notFound();

  const products = await listActiveProducts(school.id);
  const boundSubmitOrder = submitOrder.bind(null, school.slug);

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {school.name} 制服・体操服 ご注文フォーム
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          必要な商品とサイズ、数量を選択し、下記フォームに保護者様の情報をご入力の上、送信してください。
        </p>

        <OrderForm products={products} action={boundSubmitOrder} />
      </div>
    </div>
  );
}

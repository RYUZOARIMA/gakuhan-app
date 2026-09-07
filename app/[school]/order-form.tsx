"use client";

import { useActionState, useState } from "react";
import type { Product } from "@/lib/schools";
import type { OrderFormState } from "./actions";

const initialState: OrderFormState = { ok: false };

function ProductRow({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const selected = product.variants.find((v) => v.id === variantId);

  if (!selected) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <p className="min-w-[10rem] flex-1 font-medium text-zinc-900 dark:text-zinc-50">
        {product.name}
      </p>

      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        サイズ
        <select
          name="variantId"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
          className="rounded border border-zinc-300 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
        >
          {product.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.size}
            </option>
          ))}
        </select>
      </label>

      <span className="w-20 text-right text-sm text-zinc-500 dark:text-zinc-400">
        {selected.price.toLocaleString()}円
      </span>

      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        数量
        <input
          type="number"
          name="quantity"
          min={0}
          max={10}
          defaultValue={0}
          className="w-16 rounded border border-zinc-300 px-2 py-1 text-right dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
    </div>
  );
}

export function OrderForm({
  products,
  action,
}: {
  products: Product[];
  action: (
    prevState: OrderFormState,
    formData: FormData,
  ) => Promise<OrderFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  if (state.ok) {
    return (
      <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        <p className="font-medium">ご注文ありがとうございました。</p>
        <p className="mt-1 text-sm">
          注文番号: <span className="font-mono">{state.orderId}</span>
        </p>
        <p className="mt-1 text-sm">
          ご入力いただいたメールアドレス宛に控えは送信されませんが、内容は学校販売担当にて確認いたします。
        </p>
      </div>
    );
  }

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-8">
      {categories.map((category) => (
        <fieldset key={category} className="flex flex-col gap-3">
          <legend className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {category}
          </legend>
          {products
            .filter((p) => p.category === category)
            .map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
        </fieldset>
      ))}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          ご注文者情報
        </legend>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          生徒氏名
          <input
            type="text"
            name="studentName"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          学年・組
          <input
            type="text"
            name="grade"
            placeholder="例: 1年A組"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          保護者氏名
          <input
            type="text"
            name="guardianName"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          電話番号
          <input
            type="tel"
            name="phone"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          メールアドレス
          <input
            type="email"
            name="email"
            required
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          備考（任意）
          <textarea
            name="note"
            rows={3}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
      </fieldset>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {pending ? "送信中..." : "注文を送信する"}
      </button>
    </form>
  );
}

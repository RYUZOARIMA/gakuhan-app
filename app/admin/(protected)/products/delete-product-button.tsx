"use client";

export function DeleteProductButton({
  productId,
  productName,
  action,
}: {
  productId: string;
  productName: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`「${productName}」を完全に削除します。よろしいですか？（元に戻せません）`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="productName" value={productName} />
      <button
        type="submit"
        className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
      >
        完全に削除
      </button>
    </form>
  );
}

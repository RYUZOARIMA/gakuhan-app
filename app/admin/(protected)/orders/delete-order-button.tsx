"use client";

export function DeleteOrderButton({
  orderId,
  studentName,
  action,
}: {
  orderId: string;
  studentName: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !confirm(
            `「${studentName}様」の注文を完全に削除します。よろしいですか？（元に戻せません）`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
      >
        この注文を削除
      </button>
    </form>
  );
}

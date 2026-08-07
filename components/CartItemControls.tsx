"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCartItemQuantity, removeCartItem } from "@/lib/actions/cart";

export default function CartItemControls({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeQuantity(newQuantity: number) {
    startTransition(async () => {
      await updateCartItemQuantity(itemId, newQuantity);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeCartItem(itemId);
      router.refresh();
    });
  }

  return (
    <div className="mt-1 flex items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => changeQuantity(quantity - 1)}
        className="h-7 w-7 rounded border border-black/15 disabled:opacity-50 dark:border-white/20"
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span>{quantity}</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => changeQuantity(quantity + 1)}
        className="h-7 w-7 rounded border border-black/15 disabled:opacity-50 dark:border-white/20"
        aria-label="Aumentar quantidade"
      >
        +
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={remove}
        className="ml-2 text-sm text-red-600 underline disabled:opacity-50"
      >
        Remover
      </button>
    </div>
  );
}

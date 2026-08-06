import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getOrCreateCart } from "@/lib/cart";
import { formatCentsToBRL } from "@/lib/format";
import PaymentBrick from "@/components/PaymentBrick";

export default async function CheckoutPage() {
  const session = await auth();
  const cart = await getOrCreateCart(session!.user.id);

  if (cart.items.length === 0) {
    redirect("/carrinho");
  }

  const totalCents = cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>

      <div className="mb-6 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <ul className="flex flex-col gap-2">
          {cart.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.product.name}
              </span>
              <span>
                {formatCentsToBRL(item.product.priceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-black/10 pt-3 font-semibold dark:border-white/15">
          <span>Total</span>
          <span>{formatCentsToBRL(totalCents)}</span>
        </div>
      </div>

      <PaymentBrick totalCents={totalCents} />
    </main>
  );
}

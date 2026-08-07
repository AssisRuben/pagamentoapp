import Image from "next/image";
import Link from "next/link";
import { auth } from "@/auth";
import { getOrCreateCart } from "@/lib/cart";
import { formatCentsToBRL } from "@/lib/format";
import CartItemControls from "@/components/CartItemControls";

export default async function CarrinhoPage() {
  const session = await auth();
  const cart = await getOrCreateCart(session!.user.id);

  const totalCents = cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Carrinho</h1>

      {cart.items.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-black/60 dark:text-white/60">
            Seu carrinho está vazio.
          </p>
          <Link href="/" className="w-fit underline">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {cart.items.map((item) => {
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-black/5 dark:bg-white/5">
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="font-medium">{item.product.name}</span>
                  <span className="text-sm text-black/60 dark:text-white/60">
                    {formatCentsToBRL(item.product.priceCents)} / unidade
                  </span>
                  <CartItemControls itemId={item.id} quantity={item.quantity} />
                </div>
                <div className="font-semibold">
                  {formatCentsToBRL(item.product.priceCents * item.quantity)}
                </div>
              </div>
            );
          })}

          <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/15">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-lg font-semibold">
              {formatCentsToBRL(totalCents)}
            </span>
          </div>

          <Link
            href="/checkout"
            className="mt-2 w-fit self-end rounded-md bg-black px-5 py-2.5 text-white dark:bg-white dark:text-black"
          >
            Finalizar compra
          </Link>
        </div>
      )}
    </main>
  );
}

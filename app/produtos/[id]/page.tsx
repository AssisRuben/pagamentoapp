import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/format";
import { auth } from "@/auth";
import { addToCart } from "@/lib/actions/cart";

export default async function ProductPage({
  params,
}: PageProps<"/produtos/[id]">) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });

  if (!product) notFound();

  const session = await auth();
  const addToCartWithProduct = addToCart.bind(null, product.id, 1);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black/5 dark:bg-white/5">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-black/70 dark:text-white/70">
            {product.description}
          </p>
          <p className="text-xl font-semibold">
            {formatCentsToBRL(product.priceCents)}
          </p>

          {session?.user ? (
            <form action={addToCartWithProduct}>
              <button
                type="submit"
                className="rounded-md bg-black px-5 py-2.5 text-white dark:bg-white dark:text-black"
              >
                Adicionar ao carrinho
              </button>
            </form>
          ) : (
            <Link
              href={`/login?callbackUrl=/produtos/${product.id}`}
              className="w-fit rounded-md bg-black px-5 py-2.5 text-white dark:bg-white dark:text-black"
            >
              Entrar para comprar
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

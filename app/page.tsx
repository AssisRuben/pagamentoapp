import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/format";
import type { Product } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Product[] = [];
  let dbError = false;

  try {
    products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("Erro ao carregar catálogo:", error);
    dbError = true;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Catálogo</h1>
      {dbError ? (
        <p className="text-red-600">
          Não foi possível carregar o catálogo agora. Tente novamente em
          instantes.
        </p>
      ) : products.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          Nenhum produto cadastrado ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/produtos/${product.id}`}
              className="flex flex-col overflow-hidden rounded-lg border border-black/10 transition hover:border-black/30 dark:border-white/15 dark:hover:border-white/30"
            >
              <div className="relative aspect-square w-full bg-black/5 dark:bg-white/5">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <h2 className="font-medium">{product.name}</h2>
                <p className="line-clamp-2 text-sm text-black/60 dark:text-white/60">
                  {product.description}
                </p>
                <p className="mt-2 font-semibold">
                  {formatCentsToBRL(product.priceCents)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

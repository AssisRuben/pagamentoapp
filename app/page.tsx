import Link from "next/link";
import { Pill, ShoppingBag, Gift, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

const CATEGORY_SHORTCUTS = [
  { href: "/medicamentos", label: "Medicamentos", icon: Pill },
  { href: "/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "/indicacao", label: "Indique e Ganhe", icon: Gift },
];

export default async function HomePage() {
  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  let dbError = false;

  try {
    products = await prisma.product.findMany({ orderBy: { createdAt: "asc" } });
  } catch (error) {
    console.error("Erro ao carregar catálogo:", error);
    dbError = true;
  }

  const destaques = products.slice(0, Math.ceil(products.length / 2));
  const maisVendidos = products.slice(Math.ceil(products.length / 2));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold">Olá! 👋</h1>
      <p className="mb-6 text-sm text-navy/60 dark:text-white/60">
        Tudo pro seu bem-estar, perto de você.
      </p>

      <div className="snap-row mb-8">
        {CATEGORY_SHORTCUTS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex w-28 flex-col items-center gap-2 rounded-2xl bg-card p-4 text-center text-xs font-medium shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:ring-white/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/15 text-mint">
              <Icon className="h-5 w-5" />
            </span>
            {label}
          </Link>
        ))}
      </div>

      <Link
        href="/indicacao"
        className="mb-8 flex items-center justify-between rounded-2xl bg-navy px-5 py-4 text-white shadow-sm transition hover:bg-navy-light"
      >
        <div>
          <p className="font-semibold">Indique e ganhe créditos 🎁</p>
          <p className="text-sm text-white/70">
            Compartilhe seu link e acumule cashback a cada indicação
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-coral" />
      </Link>

      {dbError ? (
        <p className="text-coral">
          Não foi possível carregar o catálogo agora. Tente novamente em
          instantes.
        </p>
      ) : products.length === 0 ? (
        <p className="text-navy/60 dark:text-white/60">
          Nenhum produto cadastrado ainda.
        </p>
      ) : (
        <>
          {destaques.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Destaques</h2>
              <div className="snap-row">
                {destaques.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-40" />
                ))}
              </div>
            </section>
          )}

          {maisVendidos.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Mais vendidos</h2>
              <div className="snap-row">
                {maisVendidos.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-40" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

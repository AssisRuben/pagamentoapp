import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function MedicamentosPage() {
  const products = await prisma.product.findMany({
    where: { category: "MEDICAMENTO" },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-semibold">Medicamentos</h1>
      {products.length === 0 ? (
        <p className="text-navy/60 dark:text-white/60">
          Nenhum medicamento disponível pra compra pelo app ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}

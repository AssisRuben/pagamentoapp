import Image from "next/image";
import Link from "next/link";
import { formatCentsToBRL } from "@/lib/format";
import type { Product } from "@/lib/generated/prisma/client";

export default function ProductCard({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  return (
    <Link
      href={`/produtos/${product.id}`}
      className={`animate-pop-in flex flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:ring-white/10 ${className}`}
    >
      <div className="relative aspect-square w-full bg-black/5 dark:bg-white/5">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 45vw, 220px"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        <p className="mt-1 font-semibold text-navy dark:text-white">
          {formatCentsToBRL(product.priceCents)}
        </p>
      </div>
    </Link>
  );
}

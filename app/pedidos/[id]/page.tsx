import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/format";

const statusLabel: Record<string, string> = {
  PENDING: "Pagamento pendente",
  APPROVED: "Pagamento aprovado",
  REJECTED: "Pagamento rejeitado",
};

const statusColor: Record<string, string> = {
  PENDING: "text-amber-600",
  APPROVED: "text-green-600",
  REJECTED: "text-red-600",
};

export default async function PedidoPage({
  params,
}: PageProps<"/pedidos/[id]">) {
  const { id } = await params;
  const session = await auth();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });

  if (!order || order.userId !== session!.user.id) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">
        Pedido #{order.id.slice(-8)}
      </h1>
      <p className={`mb-6 font-medium ${statusColor[order.status]}`}>
        {statusLabel[order.status]}
      </p>

      <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
        <ul className="flex flex-col gap-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity}x {item.product.name}
              </span>
              <span>
                {formatCentsToBRL(item.unitPriceCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-black/10 pt-3 font-semibold dark:border-white/15">
          <span>Total</span>
          <span>{formatCentsToBRL(order.totalCents)}</span>
        </div>
      </div>

      {order.status === "PENDING" && (
        <p className="mt-4 text-sm text-black/60 dark:text-white/60">
          Assim que o pagamento for confirmado (ex: Pix ou boleto), o status
          desta página será atualizado automaticamente.
        </p>
      )}
    </main>
  );
}

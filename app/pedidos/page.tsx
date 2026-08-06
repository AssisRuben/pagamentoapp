import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/format";

const statusLabel: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export default async function PedidosPage() {
  const session = await auth();
  const orders = await prisma.order.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Meus pedidos</h1>

      {orders.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          Você ainda não fez nenhum pedido.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/pedidos/${order.id}`}
              className="flex items-center justify-between rounded-lg border border-black/10 p-4 dark:border-white/15"
            >
              <div>
                <p className="font-medium">Pedido #{order.id.slice(-8)}</p>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {order.createdAt.toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {formatCentsToBRL(order.totalCents)}
                </p>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {statusLabel[order.status]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

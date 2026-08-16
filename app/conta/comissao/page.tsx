import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatCentsToBRL } from "@/lib/format";

// Relatório de conferência: lista os pedidos aprovados atribuídos ao
// vendedor (comissão paga pelo Trier), pra o dono do app conferir o total.
// Não é o pagamento em si — isso é resolvido pelo Trier/farmácia.
// Só acessível pelo dono (OWNER_EMAIL) já que mostra pedidos de outros
// usuários (nome do cliente, valor da compra).
export default async function ComissaoPage() {
  const session = await auth();
  if (!session?.user?.email || session.user.email !== process.env.OWNER_EMAIL) {
    redirect("/");
  }

  const orders = await prisma.order.findMany({
    where: {
      status: "APPROVED",
      user: { vendedorAttributed: true },
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const totalCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
  const comissaoCents = Math.round(totalCents * 0.1);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Vendas atribuídas</h1>
      <p className="mb-6 text-sm text-black/60 dark:text-white/60">
        Pedidos aprovados de clientes que só existiam no app (não eram
        clientes físicos da farmácia antes da primeira compra).
      </p>

      <div className="mb-6 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <div className="flex justify-between text-sm">
          <span>Total em vendas atribuídas</span>
          <span className="font-semibold">{formatCentsToBRL(totalCents)}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-black/60 dark:text-white/60">
          <span>Comissão de referência (10%)</span>
          <span>{formatCentsToBRL(comissaoCents)}</span>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">
          Nenhum pedido atribuído ainda.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/15">
          {orders.map((order) => (
            <li key={order.id} className="flex justify-between py-3 text-sm">
              <div>
                <p>{order.user.name}</p>
                <p className="text-black/60 dark:text-white/60">
                  {order.createdAt.toLocaleDateString("pt-BR")}
                  {order.trierNumeroNota
                    ? ` · nota Trier ${order.trierNumeroNota}`
                    : order.trierError
                      ? " · não sincronizado com o Trier"
                      : ""}
                </p>
              </div>
              <span className="font-medium">
                {formatCentsToBRL(order.totalCents)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

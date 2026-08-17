import { prisma } from "@/lib/prisma";

export async function getOrCreateCart(userId: string) {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: {
      items: {
        include: { product: true },
        orderBy: { id: "asc" },
      },
    },
  });
  return cart;
}

/**
 * Versão leve para mutações (add/update/remove item): essas rotas só
 * precisam do id do carrinho, não da lista de itens com produtos. Evita uma
 * consulta pesada (join com Product) a cada clique de +/-/remover.
 */
export async function getOrCreateCartId(userId: string): Promise<string> {
  const cart = await prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { id: true },
  });
  return cart.id;
}

export async function getCartTotalCents(userId: string): Promise<number> {
  const cart = await getOrCreateCart(userId);
  return cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );
}

/**
 * Só a contagem de itens, sem upsert nem join com Product — usada no
 * badge do carrinho no header, que roda em toda navegação. Ler é
 * suficiente: se o carrinho ainda não existe, a contagem é 0 mesmo.
 */
export async function getCartItemCount(userId: string): Promise<number> {
  const result = await prisma.cartItem.aggregate({
    where: { cart: { userId } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

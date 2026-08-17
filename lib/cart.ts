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

/**
 * Mutações do carrinho como funções puras (recebem userId em vez de
 * resolver sessão) — reaproveitadas tanto pelas Server Actions em
 * lib/actions/cart.ts (páginas web) quanto pelas rotas de API em
 * app/api/mobile/cart/** (app Expo), evitando duplicar a lógica.
 */
export async function addCartItem(
  userId: string,
  productId: string,
  quantity: number = 1
) {
  const cartId = await getOrCreateCartId(userId);
  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    update: { quantity: { increment: quantity } },
    create: { cartId, productId, quantity },
  });
}

export async function updateCartItemQuantity(
  userId: string,
  itemId: string,
  quantity: number
) {
  const cartId = await getOrCreateCartId(userId);
  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId, cartId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId, cartId },
      data: { quantity },
    });
  }
}

export async function removeCartItem(userId: string, itemId: string) {
  const cartId = await getOrCreateCartId(userId);
  await prisma.cartItem.delete({ where: { id: itemId, cartId } });
}

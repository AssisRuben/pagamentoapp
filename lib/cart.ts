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

export async function getCartTotalCents(userId: string): Promise<number> {
  const cart = await getOrCreateCart(userId);
  return cart.items.reduce(
    (sum, item) => sum + item.product.priceCents * item.quantity,
    0
  );
}

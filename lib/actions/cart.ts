"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

export async function addToCart(productId: string, quantity: number = 1) {
  const userId = await requireUserId();
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantity: { increment: quantity } },
    create: { cartId: cart.id, productId, quantity },
  });

  revalidatePath("/carrinho");
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
) {
  const userId = await requireUserId();
  const cart = await getOrCreateCart(userId);

  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: { id: itemId, cartId: cart.id },
    });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId, cartId: cart.id },
      data: { quantity },
    });
  }

  revalidatePath("/carrinho");
}

export async function removeCartItem(itemId: string) {
  const userId = await requireUserId();
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.delete({
    where: { id: itemId, cartId: cart.id },
  });

  revalidatePath("/carrinho");
}

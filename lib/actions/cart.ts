"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateCartId } from "@/lib/cart";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

export async function addToCart(productId: string, quantity: number = 1) {
  const userId = await requireUserId();
  const cartId = await getOrCreateCartId(userId);

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId, productId } },
    update: { quantity: { increment: quantity } },
    create: { cartId, productId, quantity },
  });

  revalidatePath("/carrinho");
  // O botão de adicionar não mostra feedback nenhum próprio (é um <form>
  // simples); redirecionar pro carrinho é a confirmação de que funcionou.
  redirect("/carrinho");
}

export async function updateCartItemQuantity(
  itemId: string,
  quantity: number
) {
  const userId = await requireUserId();
  const cartId = await getOrCreateCartId(userId);

  if (quantity <= 0) {
    await prisma.cartItem.delete({
      where: { id: itemId, cartId },
    });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId, cartId },
      data: { quantity },
    });
  }

  revalidatePath("/carrinho");
}

export async function removeCartItem(itemId: string) {
  const userId = await requireUserId();
  const cartId = await getOrCreateCartId(userId);

  await prisma.cartItem.delete({
    where: { id: itemId, cartId },
  });

  revalidatePath("/carrinho");
}

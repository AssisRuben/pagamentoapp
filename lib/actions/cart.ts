"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import * as cart from "@/lib/cart";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

export async function addToCart(productId: string, quantity: number = 1) {
  const userId = await requireUserId();
  await cart.addCartItem(userId, productId, quantity);

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
  await cart.updateCartItemQuantity(userId, itemId, quantity);

  revalidatePath("/carrinho");
}

export async function removeCartItem(itemId: string) {
  const userId = await requireUserId();
  await cart.removeCartItem(userId, itemId);

  revalidatePath("/carrinho");
}

import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/apiAuth";
import { getOrCreateCart, removeCartItem, updateCartItemQuantity } from "@/lib/cart";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const userId = await getApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { itemId } = await params;
  const body = await request.json().catch(() => null);
  const quantity = Number(body?.quantity);

  if (!Number.isFinite(quantity)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await updateCartItemQuantity(userId, itemId, quantity);
  const cart = await getOrCreateCart(userId);
  return NextResponse.json({ cart });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const userId = await getApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { itemId } = await params;
  await removeCartItem(userId, itemId);
  const cart = await getOrCreateCart(userId);
  return NextResponse.json({ cart });
}

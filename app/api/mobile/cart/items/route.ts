import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/apiAuth";
import { addCartItem, getOrCreateCart } from "@/lib/cart";

export async function POST(request: NextRequest) {
  const userId = await getApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  const quantity = Number(body?.quantity ?? 1);

  if (typeof productId !== "string" || !Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  await addCartItem(userId, productId, quantity);
  const cart = await getOrCreateCart(userId);
  return NextResponse.json({ cart });
}

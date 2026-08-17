import { NextRequest, NextResponse } from "next/server";
import { getApiUserId } from "@/lib/apiAuth";
import { getOrCreateCart } from "@/lib/cart";

export async function GET(request: NextRequest) {
  const userId = await getApiUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const cart = await getOrCreateCart(userId);
  return NextResponse.json({ cart });
}

import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { verifyMobileToken } from "@/lib/mobileAuth";

/**
 * Autentica tanto o app Expo (header `Authorization: Bearer <jwt>`) quanto
 * as páginas web existentes (cookie de sessão do NextAuth) — as rotas de
 * API novas em app/api/mobile/** precisam funcionar pros dois.
 */
export async function getApiUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return verifyMobileToken(authHeader.slice("Bearer ".length));
  }

  const session = await auth();
  return session?.user?.id ?? null;
}

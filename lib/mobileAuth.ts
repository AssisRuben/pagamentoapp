import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.MOBILE_JWT_SECRET!);

const EXPIRATION = "30d";

export async function signMobileToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(secret);
}

/**
 * Retorna o userId do token, ou null se ausente/expirado/inválido —
 * chamadores devem tratar null como "não autenticado", nunca lançar.
 */
export async function verifyMobileToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

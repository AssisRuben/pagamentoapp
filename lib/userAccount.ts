import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/codes";
import type { User } from "@/lib/generated/prisma/client";

/**
 * Lógica de criação/verificação de conta, compartilhada entre o fluxo web
 * (NextAuth, lib/actions/auth.ts) e as rotas de API do app Expo
 * (app/api/mobile/auth/**) — evita duplicar a checagem de email
 * duplicado, hash de senha e a retentativa de colisão de referralCode.
 */

export type CreateUserAccountInput = {
  name: string;
  email: string;
  password: string;
  referralCode?: string;
};

export type CreateUserAccountResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export async function createUserAccount(
  input: CreateUserAccountInput
): Promise<CreateUserAccountResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return { ok: false, error: "Já existe uma conta com esse email" };
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const referrer = input.referralCode
    ? await prisma.user.findUnique({ where: { referralCode: input.referralCode } })
    : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const user = await prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          referralCode: generateCode(),
          referredById: referrer?.id,
          cart: { create: {} },
        },
      });
      return { ok: true, user };
    } catch (error) {
      const isUniqueReferralCollision =
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002" &&
        JSON.stringify((error as { meta?: unknown }).meta).includes("referralCode");
      if (!isUniqueReferralCollision || attempt === 4) throw error;
    }
  }
  throw new Error("Não foi possível criar a conta");
}

export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  return valid ? user : null;
}

"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signIn, signOut } from "@/auth";
import { generateCode } from "@/lib/codes";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo"),
  email: z.email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

export type RegisterState = {
  error?: string;
};

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Já existe uma conta com esse email" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const refCode = (await cookies()).get("ref")?.value;
  const referrer = refCode
    ? await prisma.user.findUnique({ where: { referralCode: refCode } })
    : null;

  // Colisão de referralCode é praticamente impossível (base36 de 7
  // caracteres), mas como o campo é único, tenta de novo em caso de erro
  // em vez de deixar o cadastro falhar.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          referralCode: generateCode(),
          referredById: referrer?.id,
          cart: { create: {} },
        },
      });
      break;
    } catch (error) {
      const isUniqueReferralCollision =
        error instanceof Error &&
        "code" in error &&
        error.code === "P2002" &&
        "meta" in error &&
        JSON.stringify((error as { meta?: unknown }).meta).includes(
          "referralCode"
        );
      if (!isUniqueReferralCollision || attempt === 4) throw error;
    }
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });

  return {};
}

export async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export type LoginState = {
  error?: string;
};

export async function loginUser(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou senha inválidos" };
    }
    throw error;
  }
}

"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { signIn, signOut } from "@/auth";
import { createUserAccount } from "@/lib/userAccount";

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
  const refCode = (await cookies()).get("ref")?.value;

  const result = await createUserAccount({ name, email, password, referralCode: refCode });
  if (!result.ok) {
    return { error: result.error };
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

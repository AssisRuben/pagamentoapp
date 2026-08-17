import { NextRequest, NextResponse } from "next/server";
import { verifyUserCredentials } from "@/lib/userAccount";
import { signMobileToken } from "@/lib/mobileAuth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 });
  }

  const token = await signMobileToken(user.id);
  return NextResponse.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

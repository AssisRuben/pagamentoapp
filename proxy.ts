import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ["/carrinho", "/checkout", "/pedidos"];

export default auth((req) => {
  const { pathname, searchParams } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Captura o código de indicação (?ref=CODIGO) em qualquer página e
  // guarda num cookie de 30 dias — lido depois no cadastro
  // (lib/actions/auth.ts). Primeiro toque vence: não sobrescreve se já
  // tiver um código salvo.
  const ref = searchParams.get("ref");
  if (ref && !req.cookies.get("ref")?.value) {
    const res = NextResponse.next();
    res.cookies.set("ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

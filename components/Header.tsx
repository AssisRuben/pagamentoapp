import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold">
          pagamentoapp
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/">Catálogo</Link>
          <Link href="/carrinho">Carrinho</Link>
          {session?.user ? (
            <>
              <Link href="/pedidos">Meus pedidos</Link>
              <span className="text-black/60 dark:text-white/60">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button type="submit" className="underline">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Entrar</Link>
              <Link href="/cadastro">Criar conta</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

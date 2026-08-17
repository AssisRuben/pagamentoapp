import Link from "next/link";
import { ShoppingCart, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { getCartItemCount } from "@/lib/cart";
import { signOutAction } from "@/lib/actions/auth";
import SideMenu from "@/components/SideMenu";

export default async function Header() {
  const session = await auth();
  const cartCount = session?.user?.id
    ? await getCartItemCount(session.user.id)
    : 0;

  return (
    <header className="sticky top-0 z-20 bg-navy text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-2 py-3">
        <div className="flex items-center gap-1">
          <SideMenu
            loggedIn={Boolean(session?.user)}
            userName={session?.user?.name ?? undefined}
            signOutAction={signOutAction}
          />
          <Link href="/" className="flex items-center gap-1.5 px-1 font-semibold">
            <Sparkles className="h-5 w-5 text-coral" strokeWidth={2.5} />
            <span>
              farmácias <span className="text-coral">conviva</span>
            </span>
          </Link>
        </div>

        <Link
          href="/carrinho"
          className="relative rounded-full p-2 transition hover:bg-white/10"
          aria-label="Carrinho"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold">
              {cartCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}

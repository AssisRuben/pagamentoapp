"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Menu,
  X,
  Sparkles,
  Home,
  Package,
  Gift,
  ShoppingCart,
  LogOut,
  LogIn,
} from "lucide-react";

const MENU_ITEMS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/carrinho", label: "Carrinho", icon: ShoppingCart },
  { href: "/pedidos", label: "Meus pedidos", icon: Package, authOnly: true },
  { href: "/indicacao", label: "Indique e Ganhe", icon: Gift },
];

export default function SideMenu({
  loggedIn,
  userName,
  signOutAction,
}: {
  loggedIn: boolean;
  userName?: string;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full p-2 transition hover:bg-white/10"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-30 transition-opacity duration-300 ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            inert={!open}
          >
          <button
            type="button"
            aria-label="Fechar menu clicando fora"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
          />

          <div
            style={{ transform: open ? "translateX(0)" : "translateX(-100%)" }}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card text-navy shadow-xl transition-transform duration-300 ease-out dark:text-foreground"
          >
            <div className="flex items-center justify-between bg-navy px-5 py-5 text-white">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-5 w-5 text-coral" strokeWidth={2.5} />
                <span>
                  Farmácia <span className="text-coral">Conviva</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-full p-1.5 transition hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loggedIn && userName && (
              <p className="border-b border-black/5 px-5 py-3 text-sm text-navy/60 dark:border-white/10 dark:text-white/60">
                Olá, {userName}
              </p>
            )}

            <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
              {MENU_ITEMS.filter((item) => !item.authOnly || loggedIn).map(
                ({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-mint/10"
                  >
                    <Icon className="h-5 w-5 text-mint" />
                    {label}
                  </Link>
                )
              )}
            </nav>

            <div className="border-t border-black/5 px-3 py-4 dark:border-white/10">
              {loggedIn ? (
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-coral transition hover:bg-coral/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-coral transition hover:bg-coral/10"
                >
                  <LogIn className="h-5 w-5" />
                  Entrar
                </Link>
              )}
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}

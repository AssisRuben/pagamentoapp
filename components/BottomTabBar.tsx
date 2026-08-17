"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Pill, ShoppingBag, HeartHandshake, Activity } from "lucide-react";

const TABS = [
  { href: "/", label: "Início", icon: Home },
  { href: "/medicamentos", label: "Medicamentos", icon: Pill },
  { href: "/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "/cuidado", label: "Cuidado", icon: HeartHandshake },
  { href: "/saude", label: "Saúde", icon: Activity },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/5 bg-card/95 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-stretch justify-around px-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors"
            >
              <Icon
                className={`h-5 w-5 transition-transform ${
                  active ? "scale-110 text-coral" : "text-navy/50 dark:text-white/50"
                }`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={active ? "text-coral" : "text-navy/50 dark:text-white/50"}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

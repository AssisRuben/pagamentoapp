"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Esconde o header quando o usuário rola pra baixo (arrasta o conteúdo pra
 * cima) e traz de volta ao rolar pra cima — mesmo comportamento do
 * Instagram, dando a tela toda pro feed de postagens durante o scroll.
 */
export default function HeaderShell({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const diff = y - lastY.current;

      if (y < 8) {
        setHidden(false);
      } else if (diff > 4) {
        setHidden(true);
      } else if (diff < -4) {
        setHidden(false);
      }
      lastY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-20 bg-navy text-white shadow-sm transition-transform duration-300 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </header>
  );
}

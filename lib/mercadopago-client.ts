"use client";

import { initMercadoPago } from "@mercadopago/sdk-react";

if (typeof window !== "undefined") {
  initMercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY!, {
    locale: "pt-BR",
  });
}

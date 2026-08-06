"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Payment } from "@mercadopago/sdk-react";
import "@/lib/mercadopago-client";

export default function PaymentBrick({ totalCents }: { totalCents: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Payment
        initialization={{ amount: totalCents / 100 }}
        customization={{
          paymentMethods: {
            creditCard: "all",
            debitCard: "all",
            bankTransfer: "all",
            ticket: "all",
          },
        }}
        onSubmit={async ({ formData }) => {
          setError(null);
          const res = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Não foi possível processar o pagamento");
            return;
          }

          const data = await res.json();
          router.push(`/pedidos/${data.orderId}`);
        }}
        onError={(err) => {
          console.error(err);
          setError("Erro ao carregar o formulário de pagamento");
        }}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Payment } from "@mercadopago/sdk-react";
import "@/lib/mercadopago-client";

type PixData = {
  orderId: string;
  qrCode: string;
  qrCodeBase64?: string;
};

export type CheckoutData = {
  cpf?: string;
  fulfillmentType: "DELIVERY" | "PICKUP";
  address?: {
    cep?: string;
    logradouro: string;
    numero?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
};

export default function PaymentBrick({
  totalCents,
  payerEmail,
  checkoutData,
}: {
  totalCents: number;
  payerEmail: string;
  checkoutData: CheckoutData;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);

  if (pix) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-black/10 p-6 text-center dark:border-white/15">
        <h2 className="text-lg font-semibold">Pague com Pix</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Escaneie o QR Code no app do seu banco ou copie o código abaixo.
        </p>
        {pix.qrCodeBase64 && (
          // eslint-disable-next-line @next/next/no-img-element -- imagem base64 gerada dinamicamente pelo Mercado Pago
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code Pix"
            className="h-56 w-56"
          />
        )}
        <div className="flex w-full max-w-md items-center gap-2">
          <input
            readOnly
            value={pix.qrCode}
            className="flex-1 truncate rounded-md border border-black/10 px-3 py-2 text-xs dark:border-white/15"
          />
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(pix.qrCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="shrink-0 rounded-md bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            {copied ? "Copiado!" : "Copiar código"}
          </button>
        </div>
        <Link href={`/pedidos/${pix.orderId}`} className="mt-2 text-sm underline">
          Já paguei, ver status do pedido
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <Payment
        initialization={{
          amount: totalCents / 100,
          payer: { email: payerEmail },
        }}
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
            body: JSON.stringify({ ...checkoutData, payment: formData }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "Não foi possível processar o pagamento");
            return;
          }

          const data = await res.json();

          if (data.pix?.qrCode) {
            setPix({
              orderId: data.orderId,
              qrCode: data.pix.qrCode,
              qrCodeBase64: data.pix.qrCodeBase64,
            });
            return;
          }

          if (data.ticketUrl) {
            window.open(data.ticketUrl, "_blank");
          }

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

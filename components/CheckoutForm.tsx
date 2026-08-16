"use client";

import { useState } from "react";
import PaymentBrick, { type CheckoutData } from "@/components/PaymentBrick";

export default function CheckoutForm({
  totalCents,
  payerEmail,
  needsCpf,
}: {
  totalCents: number;
  payerEmail: string;
  needsCpf: boolean;
}) {
  const [cpf, setCpf] = useState("");
  const [fulfillmentType, setFulfillmentType] =
    useState<CheckoutData["fulfillmentType"]>("PICKUP");
  const [address, setAddress] = useState({
    cep: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
  });
  const [confirmed, setConfirmed] = useState(false);

  const cpfValida = !needsCpf || cpf.replace(/\D/g, "").length === 11;
  const enderecoValido =
    fulfillmentType === "PICKUP" ||
    (address.logradouro.trim() &&
      address.bairro.trim() &&
      address.cidade.trim() &&
      address.estado.trim());
  const podeContinuar = cpfValida && Boolean(enderecoValido);

  if (confirmed) {
    const checkoutData: CheckoutData = {
      cpf: needsCpf ? cpf.replace(/\D/g, "") : undefined,
      fulfillmentType,
      address:
        fulfillmentType === "DELIVERY"
          ? {
              cep: address.cep || undefined,
              logradouro: address.logradouro,
              numero: address.numero || undefined,
              bairro: address.bairro,
              cidade: address.cidade,
              estado: address.estado,
            }
          : undefined,
    };

    return (
      <PaymentBrick
        totalCents={totalCents}
        payerEmail={payerEmail}
        checkoutData={checkoutData}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {needsCpf && (
        <div>
          <label htmlFor="cpf" className="mb-1 block text-sm font-medium">
            CPF
          </label>
          <input
            id="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="w-full rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
        </div>
      )}

      <div>
        <span className="mb-1 block text-sm font-medium">Como você quer receber?</span>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="fulfillmentType"
              checked={fulfillmentType === "PICKUP"}
              onChange={() => setFulfillmentType("PICKUP")}
            />
            Retirar na loja
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="fulfillmentType"
              checked={fulfillmentType === "DELIVERY"}
              onChange={() => setFulfillmentType("DELIVERY")}
            />
            Entrega
          </label>
        </div>
      </div>

      {fulfillmentType === "DELIVERY" && (
        <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <div className="flex gap-3">
            <input
              placeholder="CEP"
              value={address.cep}
              onChange={(e) => setAddress({ ...address, cep: e.target.value })}
              className="w-32 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <input
              placeholder="Número"
              value={address.numero}
              onChange={(e) => setAddress({ ...address, numero: e.target.value })}
              className="w-24 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>
          <input
            placeholder="Logradouro"
            value={address.logradouro}
            onChange={(e) => setAddress({ ...address, logradouro: e.target.value })}
            className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <input
            placeholder="Bairro"
            value={address.bairro}
            onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
            className="rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
          />
          <div className="flex gap-3">
            <input
              placeholder="Cidade"
              value={address.cidade}
              onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
              className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
            <input
              placeholder="UF"
              maxLength={2}
              value={address.estado}
              onChange={(e) =>
                setAddress({ ...address, estado: e.target.value.toUpperCase() })
              }
              className="w-16 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/15 dark:bg-transparent"
            />
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={!podeContinuar}
        onClick={() => setConfirmed(true)}
        className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        Continuar para pagamento
      </button>
    </div>
  );
}

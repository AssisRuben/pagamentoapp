"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import HealthMeasurementForm from "@/components/HealthMeasurementForm";
import type {
  HealthMeasurement,
  HealthMeasurementType,
} from "@/lib/generated/prisma/client";

const TYPE_LABELS: Record<HealthMeasurementType, string> = {
  PRESSAO: "Pressão",
  PESO: "Peso",
  GORDURA: "Gordura",
  GLICEMIA: "Glicemia",
};

function formatValue(m: HealthMeasurement) {
  switch (m.type) {
    case "PRESSAO":
      return `${m.pressaoSistolica}/${m.pressaoDiastolica} mmHg`;
    case "PESO":
      return `${m.pesoKg} kg`;
    case "GORDURA":
      return `${m.percentualGordura}%`;
    case "GLICEMIA":
      return `${m.glicemiaMgDl} mg/dL`;
  }
}

type Selection =
  | { kind: "add" }
  | { kind: "complete"; measurement: HealthMeasurement }
  | null;

export default function HealthMeasurementsView({
  pending,
  history,
}: {
  pending: HealthMeasurement[];
  history: HealthMeasurement[];
}) {
  const [selection, setSelection] = useState<Selection>(null);

  return (
    <div className="flex flex-col gap-8">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Pendentes</h2>
          <ul className="flex flex-col gap-2">
            {pending.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() =>
                    setSelection({ kind: "complete", measurement: m })
                  }
                  className="flex w-full items-center justify-between rounded-2xl bg-coral/10 p-4 text-left shadow-sm ring-1 ring-coral/20"
                >
                  <span className="text-sm font-medium">
                    {TYPE_LABELS[m.type]} · {m.local}
                  </span>
                  <span className="text-xs font-medium text-coral">
                    Toque pra preencher o resultado
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Histórico</h2>
          <button
            type="button"
            onClick={() => setSelection({ kind: "add" })}
            className="flex items-center gap-1 rounded-full bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-light"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-navy/60 dark:text-white/60">
            Nenhum registro ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              >
                <div>
                  <p className="text-sm font-medium">{TYPE_LABELS[m.type]}</p>
                  <p className="text-xs text-navy/60 dark:text-white/60">
                    {m.local} ·{" "}
                    {new Date(m.measuredAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {formatValue(m)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selection && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-[1px] sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-card p-6 shadow-xl sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selection.kind === "add"
                  ? "Novo registro"
                  : "Preencher resultado"}
              </h3>
              <button
                type="button"
                onClick={() => setSelection(null)}
                aria-label="Fechar"
                className="rounded-full p-1.5 text-navy/40 transition hover:bg-black/5 dark:text-white/40"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <HealthMeasurementForm
              pending={
                selection.kind === "complete"
                  ? {
                      id: selection.measurement.id,
                      type: selection.measurement.type,
                      local: selection.measurement.local,
                      measuredAt:
                        selection.measurement.measuredAt.toISOString(),
                    }
                  : undefined
              }
              onDone={() => setSelection(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

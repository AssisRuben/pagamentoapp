"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Pencil, Trash2, ChevronRight } from "lucide-react";
import HealthMeasurementForm from "@/components/HealthMeasurementForm";
import HealthMeasurementCharts from "@/components/HealthMeasurementCharts";
import { deleteHealthMeasurement } from "@/lib/actions/health";
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

type DayGroup = { date: string; measurements: HealthMeasurement[] };

// `history` já vem ordenado por measuredAt desc do banco, então agrupar
// preservando a ordem de inserção mantém os dias mais recentes primeiro.
function groupByDay(items: HealthMeasurement[]): DayGroup[] {
  const map = new Map<string, HealthMeasurement[]>();
  for (const m of items) {
    const key = new Date(m.measuredAt).toLocaleDateString("pt-BR");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return Array.from(map.entries()).map(([date, measurements]) => ({
    date,
    measurements,
  }));
}

type Selection =
  | { kind: "add" }
  | { kind: "edit"; measurement: HealthMeasurement }
  | { kind: "day"; date: string }
  | null;

export default function HealthMeasurementsView({
  pending,
  history,
}: {
  pending: HealthMeasurement[];
  history: HealthMeasurement[];
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (!confirm("Apagar esse registro?")) return;
    setDeletingId(id);
    startDeleteTransition(async () => {
      await deleteHealthMeasurement(id);
      router.refresh();
      setDeletingId(null);
    });
  }

  const days = groupByDay(history);
  // Deriva do `history` atual (em vez de guardar a lista de medições no
  // estado da seleção) pra o viewer refletir na hora um editar/apagar feito
  // por dentro dele mesmo, sem ficar com uma foto antiga do dia.
  const activeDay =
    selection?.kind === "day"
      ? days.find((d) => d.date === selection.date)
      : undefined;

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
                  onClick={() => setSelection({ kind: "edit", measurement: m })}
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

      <HealthMeasurementCharts history={history} />

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

        {days.length === 0 ? (
          <p className="text-sm text-navy/60 dark:text-white/60">
            Nenhum registro ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {days.map((group) => (
              <li key={group.date}>
                <button
                  type="button"
                  onClick={() => setSelection({ kind: "day", date: group.date })}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl bg-card p-4 text-left shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{group.date}</p>
                    <p className="truncate text-xs text-navy/60 dark:text-white/60">
                      {group.measurements
                        .map((m) => `${TYPE_LABELS[m.type]} ${formatValue(m)}`)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-mint/15 px-2 py-0.5 text-xs font-medium text-mint">
                      {group.measurements.length}
                    </span>
                    <ChevronRight className="h-4 w-4 text-navy/30 dark:text-white/30" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selection && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 backdrop-blur-[1px] sm:items-center">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl bg-card shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <h3 className="text-lg font-semibold">
                {selection.kind === "add" && "Novo registro"}
                {selection.kind === "edit" && "Editar registro"}
                {selection.kind === "day" && selection.date}
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

            {selection.kind === "day" ? (
              activeDay ? (
                <ul className="flex flex-col gap-2 overflow-y-auto px-6 pb-6">
                  {activeDay.measurements.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-black/5 p-3 dark:bg-white/5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{TYPE_LABELS[m.type]}</p>
                        <p className="text-xs text-navy/60 dark:text-white/60">
                          {m.local}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold">
                          {formatValue(m)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelection({ kind: "edit", measurement: m })}
                          aria-label="Editar registro"
                          className="rounded-full p-1.5 text-navy/40 transition hover:bg-mint/10 hover:text-mint dark:text-white/40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          disabled={isDeleting && deletingId === m.id}
                          aria-label="Apagar registro"
                          className="rounded-full p-1.5 text-navy/40 transition hover:bg-coral/10 hover:text-coral disabled:opacity-50 dark:text-white/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 pb-6 text-sm text-navy/60 dark:text-white/60">
                  Nenhum registro nesse dia.
                </p>
              )
            ) : (
              <div className="overflow-y-auto px-6 pb-6">
                <HealthMeasurementForm
                  editing={selection.kind === "edit" ? selection.measurement : undefined}
                  onDone={() => setSelection(null)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

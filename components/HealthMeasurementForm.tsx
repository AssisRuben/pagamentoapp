"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addHealthMeasurement,
  updateHealthMeasurement,
  type HealthMeasurementValues,
} from "@/lib/actions/health";
import type { HealthMeasurementType } from "@/lib/generated/prisma/client";

const TYPE_LABELS: Record<HealthMeasurementType, string> = {
  PRESSAO: "Pressão",
  PESO: "Peso",
  GORDURA: "Gordura",
  GLICEMIA: "Glicemia",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

// `new Date("YYYY-MM-DD")` parses as UTC midnight, which then displays as
// the previous day in timezones behind UTC (e.g. Brazil). Parsing the parts
// manually builds a local-midnight Date instead, so the day the user picked
// is the day that gets shown back.
function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

const inputClass =
  "mt-1 w-full rounded-xl border border-black/10 px-3 py-2 dark:border-white/10 dark:bg-transparent";

export default function HealthMeasurementForm({
  pending,
  onDone,
}: {
  pending?: {
    id: string;
    type: HealthMeasurementType;
    local: string;
    measuredAt: string;
  };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<HealthMeasurementType>(
    pending?.type ?? "PRESSAO"
  );
  const [pressaoSistolica, setPressaoSistolica] = useState("");
  const [pressaoDiastolica, setPressaoDiastolica] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [percentualGordura, setPercentualGordura] = useState("");
  const [glicemiaMgDl, setGlicemiaMgDl] = useState("");
  const [local, setLocal] = useState("");
  const [measuredAt, setMeasuredAt] = useState(todayInputValue());
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pending && !local.trim()) {
      setError("Informe o local.");
      return;
    }

    const values: Omit<HealthMeasurementValues, "type"> = {
      pressaoSistolica: type === "PRESSAO" ? Number(pressaoSistolica) : null,
      pressaoDiastolica: type === "PRESSAO" ? Number(pressaoDiastolica) : null,
      pesoKg: type === "PESO" ? Number(pesoKg) : null,
      percentualGordura:
        type === "GORDURA" ? Number(percentualGordura) : null,
      glicemiaMgDl: type === "GLICEMIA" ? Number(glicemiaMgDl) : null,
      local: pending ? pending.local : local.trim(),
      measuredAt: pending
        ? new Date(pending.measuredAt)
        : parseDateInput(measuredAt),
    };

    startTransition(async () => {
      try {
        if (pending) {
          await updateHealthMeasurement(pending.id, values);
        } else {
          await addHealthMeasurement({ type, ...values });
        }
        router.refresh();
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!pending && (
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(TYPE_LABELS) as HealthMeasurementType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                type === t
                  ? "bg-coral text-white"
                  : "bg-black/5 text-navy/70 dark:bg-white/10 dark:text-white/70"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {pending && (
        <p className="text-sm text-navy/60 dark:text-white/60">
          {TYPE_LABELS[pending.type]} · {pending.local} ·{" "}
          {new Date(pending.measuredAt).toLocaleDateString("pt-BR")}
        </p>
      )}

      {type === "PRESSAO" && (
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            Sistólica
            <input
              type="number"
              required
              value={pressaoSistolica}
              onChange={(e) => setPressaoSistolica(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex-1 text-sm">
            Diastólica
            <input
              type="number"
              required
              value={pressaoDiastolica}
              onChange={(e) => setPressaoDiastolica(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>
      )}

      {type === "PESO" && (
        <label className="text-sm">
          Peso (kg)
          <input
            type="number"
            step="0.1"
            required
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {type === "GORDURA" && (
        <label className="text-sm">
          Gordura corporal (%)
          <input
            type="number"
            step="0.1"
            required
            value={percentualGordura}
            onChange={(e) => setPercentualGordura(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {type === "GLICEMIA" && (
        <label className="text-sm">
          Glicemia (mg/dL)
          <input
            type="number"
            required
            value={glicemiaMgDl}
            onChange={(e) => setGlicemiaMgDl(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {!pending && (
        <>
          <label className="text-sm">
            Data
            <input
              type="date"
              required
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="text-sm">
            Local
            <input
              type="text"
              required
              placeholder="Ex.: em casa, academia..."
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className={inputClass}
            />
          </label>
        </>
      )}

      {error && <p className="text-sm text-coral">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition hover:bg-coral-light disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}

"use client";

import { useState, useTransition, type FocusEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addHealthMeasurements,
  updateHealthMeasurement,
  type HealthMeasurementValues,
} from "@/lib/actions/health";
import type { HealthMeasurement } from "@/lib/generated/prisma/client";

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

function localToPreset(local: string): "Farmácia Conviva" | "Casa" | "Outro" {
  return local === "Farmácia Conviva" || local === "Casa" ? local : "Outro";
}

const inputClass =
  "mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-base dark:border-white/10 dark:bg-transparent";

// Sobe o campo focado pro centro da tela quando o teclado do celular abre
// por cima dele, senão o usuário fica digitando num campo que não vê mais.
function scrollFieldIntoView(e: FocusEvent<HTMLElement>) {
  e.currentTarget.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function HealthMeasurementForm({
  editing,
  onDone,
}: {
  editing?: HealthMeasurement;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [pressaoSistolica, setPressaoSistolica] = useState(
    editing?.pressaoSistolica?.toString() ?? ""
  );
  const [pressaoDiastolica, setPressaoDiastolica] = useState(
    editing?.pressaoDiastolica?.toString() ?? ""
  );
  const [pesoKg, setPesoKg] = useState(editing?.pesoKg?.toString() ?? "");
  const [percentualGordura, setPercentualGordura] = useState(
    editing?.percentualGordura?.toString() ?? ""
  );
  const [glicemiaMgDl, setGlicemiaMgDl] = useState(
    editing?.glicemiaMgDl?.toString() ?? ""
  );

  const [localPreset, setLocalPreset] = useState<
    "Farmácia Conviva" | "Casa" | "Outro"
  >(editing ? localToPreset(editing.local) : "Casa");
  const [localOutro, setLocalOutro] = useState(
    editing && localToPreset(editing.local) === "Outro" ? editing.local : ""
  );
  const [measuredAt, setMeasuredAt] = useState(
    editing ? editing.measuredAt.toISOString().slice(0, 10) : todayInputValue()
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const local = localPreset === "Outro" ? localOutro.trim() : localPreset;
    if (!local) {
      setError("Informe o local.");
      return;
    }

    const shared = { local, measuredAt: parseDateInput(measuredAt) };

    if (editing) {
      const values: Omit<HealthMeasurementValues, "type"> = {
        pressaoSistolica:
          editing.type === "PRESSAO" ? Number(pressaoSistolica) : null,
        pressaoDiastolica:
          editing.type === "PRESSAO" ? Number(pressaoDiastolica) : null,
        pesoKg: editing.type === "PESO" ? Number(pesoKg) : null,
        percentualGordura:
          editing.type === "GORDURA" ? Number(percentualGordura) : null,
        glicemiaMgDl: editing.type === "GLICEMIA" ? Number(glicemiaMgDl) : null,
        ...shared,
      };
      startTransition(async () => {
        try {
          await updateHealthMeasurement(editing.id, values);
          router.refresh();
          onDone?.();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Não foi possível salvar.");
        }
      });
      return;
    }

    const entries: HealthMeasurementValues[] = [];
    if (pressaoSistolica && pressaoDiastolica) {
      entries.push({
        type: "PRESSAO",
        pressaoSistolica: Number(pressaoSistolica),
        pressaoDiastolica: Number(pressaoDiastolica),
        ...shared,
      });
    }
    if (pesoKg) {
      entries.push({ type: "PESO", pesoKg: Number(pesoKg), ...shared });
    }
    if (percentualGordura) {
      entries.push({
        type: "GORDURA",
        percentualGordura: Number(percentualGordura),
        ...shared,
      });
    }
    if (glicemiaMgDl) {
      entries.push({
        type: "GLICEMIA",
        glicemiaMgDl: Number(glicemiaMgDl),
        ...shared,
      });
    }

    if (entries.length === 0) {
      setError("Preencha ao menos uma medida.");
      return;
    }

    startTransition(async () => {
      try {
        await addHealthMeasurements(entries);
        router.refresh();
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar.");
      }
    });
  }

  const showPressao = !editing || editing.type === "PRESSAO";
  const showPeso = !editing || editing.type === "PESO";
  const showGordura = !editing || editing.type === "GORDURA";
  const showGlicemia = !editing || editing.type === "GLICEMIA";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {showPressao && (
        <div>
          <p className="text-sm font-medium">Pressão (mmHg)</p>
          <div className="mt-1 flex gap-3">
            <label className="flex-1 text-xs text-navy/60 dark:text-white/60">
              Sistólica
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pressaoSistolica}
                onChange={(e) => setPressaoSistolica(e.target.value)}
                onFocus={scrollFieldIntoView}
                className={inputClass}
              />
            </label>
            <label className="flex-1 text-xs text-navy/60 dark:text-white/60">
              Diastólica
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pressaoDiastolica}
                onChange={(e) => setPressaoDiastolica(e.target.value)}
                onFocus={scrollFieldIntoView}
                className={inputClass}
              />
            </label>
          </div>
        </div>
      )}

      {showPeso && (
        <label className="text-sm">
          Peso (kg)
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            onFocus={scrollFieldIntoView}
            className={inputClass}
          />
        </label>
      )}

      {showGordura && (
        <label className="text-sm">
          Gordura corporal (%)
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={percentualGordura}
            onChange={(e) => setPercentualGordura(e.target.value)}
            onFocus={scrollFieldIntoView}
            className={inputClass}
          />
        </label>
      )}

      {showGlicemia && (
        <label className="text-sm">
          Glicemia (mg/dL)
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={glicemiaMgDl}
            onChange={(e) => setGlicemiaMgDl(e.target.value)}
            onFocus={scrollFieldIntoView}
            className={inputClass}
          />
        </label>
      )}

      <label className="text-sm">
        Data
        <input
          type="date"
          required
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
          onFocus={scrollFieldIntoView}
          className={inputClass}
        />
      </label>

      <div>
        <p className="text-sm">Local</p>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(["Farmácia Conviva", "Casa", "Outro"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLocalPreset(option)}
              className={`rounded-xl px-2 py-2 text-xs font-medium transition ${
                localPreset === option
                  ? "bg-coral text-white"
                  : "bg-black/5 text-navy/70 dark:bg-white/10 dark:text-white/70"
              }`}
            >
              {option === "Farmácia Conviva" ? "Farmácia" : option}
            </button>
          ))}
        </div>
        {localPreset === "Outro" && (
          <input
            type="text"
            placeholder="Onde foi medido?"
            value={localOutro}
            onChange={(e) => setLocalOutro(e.target.value)}
            onFocus={scrollFieldIntoView}
            className={`${inputClass} mt-2`}
          />
        )}
      </div>

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

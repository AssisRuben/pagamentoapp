"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CareCategory } from "@/lib/generated/prisma/client";
import { CARE_CATEGORIES, CARE_CATEGORY_META, WEEKDAY_LABELS } from "@/lib/careCategories";
import {
  createChecklistItem,
  updateChecklistItem,
  type RoutineItemInput,
} from "@/lib/actions/careChecklist";

export type RoutineFormInitial = {
  id?: string;
  title: string;
  category: CareCategory;
  timeOfDay: string | null;
  daysOfWeek: number[];
};

export default function RoutineItemForm({
  initial,
  onDone,
}: {
  initial?: RoutineFormInitial;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<CareCategory>(initial?.category ?? "OUTRO");
  const [timeOfDay, setTimeOfDay] = useState(initial?.timeOfDay ?? "");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(initial?.daysOfWeek ?? []);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setError(null);

    const input: RoutineItemInput = {
      title,
      category,
      timeOfDay: timeOfDay || null,
      daysOfWeek,
    };

    startTransition(async () => {
      try {
        if (initial?.id) {
          await updateChecklistItem(initial.id, input);
        } else {
          await createChecklistItem(input);
        }
        router.refresh();
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Ex: Tomar Losartana, Treino de força..."
        className="rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-mint dark:border-white/15"
        required
      />

      <div className="flex flex-wrap gap-2">
        {CARE_CATEGORIES.map((cat) => {
          const meta = CARE_CATEGORY_META[cat];
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                category === cat
                  ? "bg-navy text-white dark:bg-white dark:text-navy"
                  : "bg-black/5 text-navy/70 dark:bg-white/10 dark:text-white/70"
              }`}
            >
              {meta.emoji} {meta.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="timeOfDay" className="text-sm text-navy/60 dark:text-white/60">
          Horário (opcional)
        </label>
        <input
          id="timeOfDay"
          type="time"
          value={timeOfDay}
          onChange={(e) => setTimeOfDay(e.target.value)}
          className="rounded-xl border border-black/10 px-3 py-1.5 text-sm outline-none focus:border-mint dark:border-white/15"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_LABELS.map((label, day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={`h-9 w-12 rounded-lg text-xs font-medium ${
              daysOfWeek.includes(day)
                ? "bg-mint text-white"
                : "bg-black/5 text-navy/70 dark:bg-white/10 dark:text-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-xs text-navy/50 dark:text-white/50">
        Nenhum dia selecionado = todo dia.
      </p>

      {error && <p className="text-sm text-coral">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-navy"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl px-4 py-2 text-sm text-navy/60 dark:text-white/60"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

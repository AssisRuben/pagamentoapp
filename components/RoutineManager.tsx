"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { CareCategory } from "@/lib/generated/prisma/client";
import { CARE_CATEGORIES, CARE_CATEGORY_META, WEEKDAY_LABELS } from "@/lib/careCategories";
import { deactivateChecklistItem } from "@/lib/actions/careChecklist";
import RoutineItemForm from "@/components/RoutineItemForm";

export type RoutineItemView = {
  id: string;
  title: string;
  category: CareCategory;
  timeOfDay: string | null;
  daysOfWeek: number[];
};

export default function RoutineManager({ items }: { items: RoutineItemView[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<"closed" | "create" | string>("closed");

  function remove(id: string) {
    startTransition(async () => {
      await deactivateChecklistItem(id);
      router.refresh();
    });
  }

  const grouped = CARE_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {formState === "create" ? (
        <RoutineItemForm onDone={() => setFormState("closed")} />
      ) : (
        <button
          type="button"
          onClick={() => setFormState("create")}
          className="flex w-fit items-center gap-2 rounded-full bg-mint/15 px-4 py-2 text-sm font-medium text-mint"
        >
          <Plus className="h-4 w-4" />
          Novo cuidado
        </button>
      )}

      {items.length === 0 && formState !== "create" && (
        <p className="text-sm text-navy/60 dark:text-white/60">
          Nenhum cuidado cadastrado ainda.
        </p>
      )}

      {grouped.map(({ category, items: catItems }) => {
        const meta = CARE_CATEGORY_META[category];
        return (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold text-navy/70 dark:text-white/70">
              {meta.emoji} {meta.label}
            </h2>
            <div className="flex flex-col gap-2">
              {catItems.map((item) =>
                formState === item.id ? (
                  <RoutineItemForm
                    key={item.id}
                    initial={item}
                    onDone={() => setFormState("closed")}
                  />
                ) : (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-navy/50 dark:text-white/50">
                        {item.timeOfDay ?? "Sem horário fixo"}
                        {" · "}
                        {item.daysOfWeek.length === 0
                          ? "Todo dia"
                          : item.daysOfWeek.map((d) => WEEKDAY_LABELS[d]).join(", ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormState(item.id)}
                      className="rounded-full p-2 text-navy/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => remove(item.id)}
                      className="rounded-full p-2 text-coral hover:bg-coral/10 disabled:opacity-50"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

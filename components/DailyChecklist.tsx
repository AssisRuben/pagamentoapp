"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import {
  completeChecklistItem,
  createChecklistItem,
  uncompleteChecklistItem,
} from "@/lib/actions/careChecklist";

export type ChecklistItemView = {
  id: string;
  title: string;
  completedToday: boolean;
};

export default function DailyChecklist({
  items,
}: {
  items: ChecklistItemView[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const allDone = items.length > 0 && items.every((item) => item.completedToday);

  function toggle(item: ChecklistItemView) {
    startTransition(async () => {
      if (item.completedToday) {
        await uncompleteChecklistItem(item.id);
      } else {
        await completeChecklistItem(item.id);
      }
      router.refresh();
    });
  }

  function submitNewItem(formData: FormData) {
    const title = String(formData.get("title") ?? "");
    if (!title.trim()) return;
    startTransition(async () => {
      await createChecklistItem(title);
      setNewTitle("");
      setAdding(false);
      router.refresh();
    });
  }

  return (
    <section className="mb-8 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cuidados de hoje</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full bg-mint/15 px-3 py-1.5 text-xs font-medium text-mint"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </button>
        )}
      </div>

      {allDone && (
        <p className="mb-3 rounded-xl bg-mint/10 px-3 py-2 text-sm font-medium text-mint">
          🎉 Você concluiu todos os cuidados de hoje!
        </p>
      )}

      {items.length === 0 && !adding && (
        <p className="text-sm text-navy/60 dark:text-white/60">
          Nenhum cuidado cadastrado ainda — adicione medicações, treinos ou
          qualquer rotina que queira acompanhar.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => toggle(item)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-mint/5 disabled:opacity-50"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  item.completedToday
                    ? "border-mint bg-mint text-white"
                    : "border-black/20 dark:border-white/25"
                }`}
              >
                {item.completedToday && <Check className="h-3 w-3" />}
              </span>
              <span
                className={item.completedToday ? "text-navy/50 line-through dark:text-white/40" : ""}
              >
                {item.title}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <form
          action={submitNewItem}
          className="mt-3 flex items-center gap-2 border-t border-black/5 pt-3 dark:border-white/10"
        >
          <input
            autoFocus
            name="title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex: Tomar Losartana, Treino 30min..."
            className="flex-1 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-mint dark:border-white/15"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-navy px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-xl px-2 py-2 text-sm text-navy/60 dark:text-white/60"
          >
            Cancelar
          </button>
        </form>
      )}
    </section>
  );
}

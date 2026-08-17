"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Settings2 } from "lucide-react";
import type { CareCategory } from "@/lib/generated/prisma/client";
import { CARE_CATEGORY_META } from "@/lib/careCategories";
import { completeChecklistItem, uncompleteChecklistItem } from "@/lib/actions/careChecklist";

export type ChecklistItemView = {
  id: string;
  title: string;
  category: CareCategory;
  timeOfDay: string | null;
  completedToday: boolean;
};

export default function DailyChecklist({
  items,
}: {
  items: ChecklistItemView[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
    <section className="mb-8 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cuidados de hoje</h2>
        <Link
          href="/rotina"
          className="flex items-center gap-1 rounded-full bg-mint/15 px-3 py-1.5 text-xs font-medium text-mint"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Gerenciar rotina
        </Link>
      </div>

      {allDone && (
        <p className="mb-3 rounded-xl bg-mint/10 px-3 py-2 text-sm font-medium text-mint">
          🎉 Você concluiu todos os cuidados de hoje!
        </p>
      )}

      {items.length === 0 && (
        <p className="text-sm text-navy/60 dark:text-white/60">
          Nenhum cuidado cadastrado ainda —{" "}
          <Link href="/rotina" className="font-medium text-mint underline">
            monte sua rotina
          </Link>{" "}
          de medicação, treino, alimentação e mais.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const meta = CARE_CATEGORY_META[item.category];
          return (
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
                <span className="shrink-0">{meta.emoji}</span>
                <span
                  className={`flex-1 ${item.completedToday ? "text-navy/50 line-through dark:text-white/40" : ""}`}
                >
                  {item.title}
                </span>
                {item.timeOfDay && (
                  <span className="shrink-0 text-xs text-navy/40 dark:text-white/40">
                    {item.timeOfDay}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkCareCompletionAchievement } from "@/lib/timeline/achievements";
import { todayDate } from "@/lib/timeline/format";
import type { CareCategory } from "@/lib/generated/prisma/client";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

export type RoutineItemInput = {
  title: string;
  category: CareCategory;
  timeOfDay?: string | null;
  daysOfWeek: number[];
};

function validateRoutineInput(input: RoutineItemInput) {
  const title = input.title.trim();
  if (!title) throw new Error("Descreva o cuidado");
  if (input.timeOfDay && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.timeOfDay)) {
    throw new Error("Horário inválido");
  }
  if (input.daysOfWeek.some((d) => d < 0 || d > 6)) {
    throw new Error("Dia da semana inválido");
  }
  return title;
}

export async function createChecklistItem(input: RoutineItemInput) {
  const userId = await requireUserId();
  const title = validateRoutineInput(input);

  await prisma.careChecklistItem.create({
    data: {
      userId,
      title,
      category: input.category,
      timeOfDay: input.timeOfDay || null,
      daysOfWeek: input.daysOfWeek,
    },
  });

  revalidatePath("/");
  revalidatePath("/rotina");
}

export async function updateChecklistItem(id: string, input: RoutineItemInput) {
  const userId = await requireUserId();
  const title = validateRoutineInput(input);

  const item = await prisma.careChecklistItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    throw new Error("Sem permissão pra editar esse cuidado");
  }

  await prisma.careChecklistItem.update({
    where: { id },
    data: {
      title,
      category: input.category,
      timeOfDay: input.timeOfDay || null,
      daysOfWeek: input.daysOfWeek,
    },
  });

  revalidatePath("/");
  revalidatePath("/rotina");
}

export async function deactivateChecklistItem(id: string) {
  const userId = await requireUserId();

  const item = await prisma.careChecklistItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    throw new Error("Sem permissão pra remover esse cuidado");
  }

  await prisma.careChecklistItem.update({
    where: { id },
    data: { active: false },
  });

  revalidatePath("/");
  revalidatePath("/rotina");
}

export async function completeChecklistItem(itemId: string) {
  const userId = await requireUserId();

  const item = await prisma.careChecklistItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== userId) {
    throw new Error("Sem permissão pra marcar esse cuidado");
  }

  const date = todayDate();

  await prisma.careChecklistCompletion.upsert({
    where: { itemId_date: { itemId, date } },
    update: {},
    create: { itemId, date },
  });

  await checkCareCompletionAchievement(userId, date);

  revalidatePath("/");
  revalidatePath("/rotina");
}

export async function uncompleteChecklistItem(itemId: string) {
  const userId = await requireUserId();

  const item = await prisma.careChecklistItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== userId) {
    throw new Error("Sem permissão pra desmarcar esse cuidado");
  }

  const date = todayDate();

  await prisma.careChecklistCompletion
    .delete({ where: { itemId_date: { itemId, date } } })
    .catch(() => {
      // não havia conclusão hoje pra remover — ok, é idempotente
    });

  revalidatePath("/");
  revalidatePath("/rotina");
}

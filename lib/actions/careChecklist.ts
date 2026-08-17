"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkCareCompletionAchievement } from "@/lib/timeline/achievements";
import { todayDate } from "@/lib/timeline/format";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

export async function createChecklistItem(title: string) {
  const userId = await requireUserId();
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Descreva o cuidado");

  await prisma.careChecklistItem.create({
    data: { userId, title: trimmed },
  });

  revalidatePath("/");
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
}

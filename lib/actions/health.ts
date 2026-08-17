"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { HealthMeasurementType } from "@/lib/generated/prisma/client";
import {
  checkPressureAchievement,
  checkWeightAchievement,
} from "@/lib/timeline/achievements";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

export type HealthMeasurementValues = {
  type: HealthMeasurementType;
  pressaoSistolica?: number | null;
  pressaoDiastolica?: number | null;
  pesoKg?: number | null;
  percentualGordura?: number | null;
  glicemiaMgDl?: number | null;
  local: string;
  measuredAt: Date;
};

async function checkAchievementsForTypes(
  userId: string,
  types: HealthMeasurementType[]
) {
  if (types.includes("PESO")) await checkWeightAchievement(userId);
  if (types.includes("PRESSAO")) await checkPressureAchievement(userId);
}

export async function addHealthMeasurement(values: HealthMeasurementValues) {
  const userId = await requireUserId();

  await prisma.healthMeasurement.create({
    data: { userId, ...values },
  });
  await checkAchievementsForTypes(userId, [values.type]);

  revalidatePath("/saude");
  revalidatePath("/");
}

/**
 * Cria vários registros de uma vez (um por tipo preenchido no formulário de
 * "Novo registro", que mostra os 4 campos ao mesmo tempo em vez de pedir
 * pra escolher um tipo por vez).
 */
export async function addHealthMeasurements(entries: HealthMeasurementValues[]) {
  const userId = await requireUserId();

  await prisma.healthMeasurement.createMany({
    data: entries.map((values) => ({ userId, ...values })),
  });
  await checkAchievementsForTypes(
    userId,
    entries.map((e) => e.type)
  );

  revalidatePath("/saude");
  revalidatePath("/");
}

export async function updateHealthMeasurement(
  id: string,
  values: Omit<HealthMeasurementValues, "type">
) {
  const userId = await requireUserId();

  const existing = await prisma.healthMeasurement.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("Sem permissão pra editar esse registro");
  }

  await prisma.healthMeasurement.update({
    where: { id },
    data: values,
  });

  revalidatePath("/saude");
}

export async function deleteHealthMeasurement(id: string) {
  const userId = await requireUserId();

  const existing = await prisma.healthMeasurement.findUnique({
    where: { id },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("Sem permissão pra remover esse registro");
  }

  await prisma.healthMeasurement.delete({ where: { id } });

  revalidatePath("/saude");
}

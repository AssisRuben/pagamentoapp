import { prisma } from "@/lib/prisma";

function daysBefore(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Compara a última medição de peso com a mais próxima de ~7 dias antes.
 * Registra uma conquista se caiu, no máximo uma vez a cada 7 dias (evita
 * gerar uma conquista nova a cada pesagem).
 */
export async function checkWeightAchievement(userId: string): Promise<void> {
  const measurements = await prisma.healthMeasurement.findMany({
    where: { userId, type: "PESO", pesoKg: { not: null } },
    orderBy: { measuredAt: "desc" },
    take: 20,
  });
  if (measurements.length < 2) return;

  const latest = measurements[0];
  const weekAgoTarget = daysBefore(latest.measuredAt, 7);
  const candidate = measurements.slice(1).find((m) => m.measuredAt <= weekAgoTarget);
  if (!candidate || candidate.pesoKg == null || latest.pesoKg == null) return;
  if (latest.pesoKg >= candidate.pesoKg) return;

  const recent = await prisma.timelineEvent.findFirst({
    where: { userId, type: "ACHIEVEMENT_WEIGHT", occurredAt: { gte: weekAgoTarget } },
  });
  if (recent) return;

  const diff = (candidate.pesoKg - latest.pesoKg).toFixed(1);
  await prisma.timelineEvent.create({
    data: {
      userId,
      type: "ACHIEVEMENT_WEIGHT",
      title: "Peso em queda 🎉",
      message: `Seu peso caiu ${diff}kg nos últimos dias. Continue assim!`,
      occurredAt: latest.measuredAt,
    },
  });
}

/**
 * Mesma lógica do peso, mas exige que sistólica E diastólica tenham caído
 * em relação à leitura de ~7 dias antes.
 */
export async function checkPressureAchievement(userId: string): Promise<void> {
  const measurements = await prisma.healthMeasurement.findMany({
    where: {
      userId,
      type: "PRESSAO",
      pressaoSistolica: { not: null },
      pressaoDiastolica: { not: null },
    },
    orderBy: { measuredAt: "desc" },
    take: 20,
  });
  if (measurements.length < 2) return;

  const latest = measurements[0];
  const weekAgoTarget = daysBefore(latest.measuredAt, 7);
  const candidate = measurements.slice(1).find((m) => m.measuredAt <= weekAgoTarget);
  if (
    !candidate ||
    latest.pressaoSistolica == null ||
    latest.pressaoDiastolica == null ||
    candidate.pressaoSistolica == null ||
    candidate.pressaoDiastolica == null
  ) {
    return;
  }

  const improved =
    latest.pressaoSistolica < candidate.pressaoSistolica &&
    latest.pressaoDiastolica < candidate.pressaoDiastolica;
  if (!improved) return;

  const recent = await prisma.timelineEvent.findFirst({
    where: { userId, type: "ACHIEVEMENT_PRESSURE", occurredAt: { gte: weekAgoTarget } },
  });
  if (recent) return;

  await prisma.timelineEvent.create({
    data: {
      userId,
      type: "ACHIEVEMENT_PRESSURE",
      title: "Pressão melhorando 🎉",
      message: `Sua pressão foi de ${candidate.pressaoSistolica}/${candidate.pressaoDiastolica} para ${latest.pressaoSistolica}/${latest.pressaoDiastolica}.`,
      occurredAt: latest.measuredAt,
    },
  });
}

/**
 * Se todo item ativo da checklist do usuário tem uma conclusão pra `date`,
 * registra a conquista do dia completo (uma vez por dia).
 */
export async function checkCareCompletionAchievement(
  userId: string,
  date: Date
): Promise<void> {
  const day = startOfDay(date);
  const nextDay = daysBefore(day, -1);

  const activeItems = await prisma.careChecklistItem.findMany({
    where: { userId, active: true },
    select: { id: true },
  });
  if (activeItems.length === 0) return;

  const completions = await prisma.careChecklistCompletion.count({
    where: { date: day, itemId: { in: activeItems.map((i) => i.id) } },
  });
  if (completions < activeItems.length) return;

  const alreadyRecorded = await prisma.timelineEvent.findFirst({
    where: {
      userId,
      type: "ACHIEVEMENT_CARE_COMPLETE",
      occurredAt: { gte: day, lt: nextDay },
    },
  });
  if (alreadyRecorded) return;

  await prisma.timelineEvent.create({
    data: {
      userId,
      type: "ACHIEVEMENT_CARE_COMPLETE",
      title: "Dia completo! ✅",
      message: "Você concluiu todos os seus cuidados de hoje.",
      occurredAt: date,
    },
  });
}

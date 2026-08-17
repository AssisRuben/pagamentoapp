import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push/sendPush";
import { todayDate } from "@/lib/timeline/format";

// Brasil não observa mais horário de verão (desde 2019) — offset fixo,
// mesmo truque já usado em lib/trier.ts#formatTrierDate.
const BRAZIL_OFFSET_HOURS = -3;

function brazilNow(): Date {
  return new Date(Date.now() + BRAZIL_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Chamado pelos crons horários definidos em vercel.json (1x por hora,
 * já que o plano Hobby só permite 1x/dia por cron individual — 24 crons
 * cobrem as 24 horas). Idempotente via CareReminderDispatch: mesmo que
 * essa rota rode mais de uma vez na mesma janela, não manda duas
 * notificações pro mesmo item no mesmo dia.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const brazilTime = brazilNow();
  const currentHour = brazilTime.getUTCHours();
  const currentDayOfWeek = brazilTime.getUTCDay();
  const date = todayDate();

  const items = await prisma.careChecklistItem.findMany({
    where: { active: true, timeOfDay: { not: null } },
  });

  const due = items.filter((item) => {
    const hour = Number(item.timeOfDay!.split(":")[0]);
    if (hour !== currentHour) return false;
    if (item.daysOfWeek.length > 0 && !item.daysOfWeek.includes(currentDayOfWeek)) {
      return false;
    }
    return true;
  });

  let sent = 0;
  for (const item of due) {
    const [alreadyCompleted, alreadyDispatched] = await Promise.all([
      prisma.careChecklistCompletion.findUnique({
        where: { itemId_date: { itemId: item.id, date } },
      }),
      prisma.careReminderDispatch.findUnique({
        where: { itemId_date: { itemId: item.id, date } },
      }),
    ]);
    if (alreadyCompleted || alreadyDispatched) continue;

    await sendPushToUser(item.userId, {
      title: "Hora do seu cuidado 💙",
      body: item.title,
      url: "/rotina",
    });
    await prisma.careReminderDispatch.create({ data: { itemId: item.id, date } });
    sent++;
  }

  return NextResponse.json({ checked: items.length, due: due.length, sent });
}

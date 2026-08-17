import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import NotificationToggle from "@/components/NotificationToggle";
import RoutineManager, { type RoutineItemView } from "@/components/RoutineManager";

export const dynamic = "force-dynamic";

export default async function RotinaPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const items = await prisma.careChecklistItem.findMany({
    where: { userId: session.user.id, active: true },
    orderBy: { createdAt: "asc" },
  });

  const itemViews: RoutineItemView[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    timeOfDay: item.timeOfDay,
    daysOfWeek: item.daysOfWeek,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold">Minha rotina</h1>
      <p className="mb-4 text-sm text-navy/60 dark:text-white/60">
        Organize medicação, treino, alimentação, estudos e terapias — com
        horário e dias da semana pra te lembrar na hora certa.
      </p>

      <NotificationToggle />

      <RoutineManager items={itemViews} />
    </main>
  );
}

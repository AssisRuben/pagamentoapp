import Link from "next/link";
import { Activity } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import HealthMeasurementsView from "@/components/HealthMeasurementsView";
import type { HealthMeasurement } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

function isPending(m: HealthMeasurement) {
  return (
    m.pressaoSistolica === null &&
    m.pressaoDiastolica === null &&
    m.pesoKg === null &&
    m.percentualGordura === null &&
    m.glicemiaMgDl === null
  );
}

export default async function SaudePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <Activity className="mb-4 h-10 w-10 text-coral" />
        <h1 className="mb-2 text-xl font-semibold">Saúde</h1>
        <p className="mb-6 text-sm text-navy/60 dark:text-white/60">
          Entre na sua conta pra acompanhar pressão, peso, gordura e
          glicemia.
        </p>
        <Link
          href="/login?callbackUrl=/saude"
          className="rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition hover:bg-coral-light"
        >
          Entrar
        </Link>
      </main>
    );
  }

  const measurements = await prisma.healthMeasurement.findMany({
    where: { userId: session.user.id },
    orderBy: { measuredAt: "desc" },
  });

  const pending = measurements.filter(isPending);
  const history = measurements.filter((m) => !isPending(m));

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex flex-col items-center rounded-3xl bg-navy p-8 text-center text-white">
        <Activity className="mb-3 h-9 w-9 text-coral" />
        <h1 className="mb-1 text-xl font-semibold">Saúde</h1>
        <p className="text-sm text-white/70">
          Acompanhe pressão, peso, gordura e glicemia ao longo do tempo.
        </p>
      </div>

      <HealthMeasurementsView pending={pending} history={history} />
    </main>
  );
}

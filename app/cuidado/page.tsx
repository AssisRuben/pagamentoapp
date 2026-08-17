import Link from "next/link";
import { HeartHandshake, X } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCareSignal, type CareSignalLevel } from "@/lib/care";
import { createCareInvite, revokeCareLink } from "@/lib/actions/care";
import CopyReferralLink from "@/components/CopyReferralLink";

export const dynamic = "force-dynamic";

const SIGNAL_STYLES: Record<CareSignalLevel, string> = {
  unknown: "bg-black/5 text-navy/60 dark:bg-white/10 dark:text-white/60",
  green: "bg-mint/15 text-mint",
  yellow: "bg-yellow-400/15 text-yellow-600 dark:text-yellow-400",
  red: "bg-coral/15 text-coral",
};

export default async function CuidadoPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <HeartHandshake className="mb-4 h-10 w-10 text-coral" />
        <h1 className="mb-2 text-xl font-semibold">Cuidado</h1>
        <p className="mb-6 text-sm text-navy/60 dark:text-white/60">
          Entre na sua conta pra convidar alguém pra cuidar de você, ou
          acompanhar quem você já cuida.
        </p>
        <Link
          href="/login?callbackUrl=/cuidado"
          className="rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition hover:bg-coral-light"
        >
          Entrar
        </Link>
      </main>
    );
  }

  const userId = session.user.id;
  const inviteCode = await createCareInvite();
  const inviteLink = `${process.env.NEXTAUTH_URL}/cuidado/convite/${inviteCode}`;

  const [caregiversOfMe, peopleICareFor] = await Promise.all([
    prisma.careLink.findMany({
      where: { titularId: userId, status: "ACTIVE" },
      include: { caregiver: true },
    }),
    prisma.careLink.findMany({
      where: { caregiverId: userId, status: "ACTIVE" },
      include: { titular: true },
    }),
  ]);

  const signals = await Promise.all(
    peopleICareFor.map((link) => getCareSignal(link.titularId))
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex flex-col items-center rounded-3xl bg-navy p-8 text-center text-white">
        <HeartHandshake className="mb-3 h-9 w-9 text-coral" />
        <h1 className="mb-1 text-xl font-semibold">Cuidado</h1>
        <p className="text-sm text-white/70">
          Peça pra alguém acompanhar você à distância, com discrição — ou
          acompanhe quem você já cuida.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Quem cuida de você</h2>

        {caregiversOfMe.length > 0 && (
          <ul className="mb-4 flex flex-col gap-2">
            {caregiversOfMe.map((link) => (
              <li
                key={link.id}
                className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              >
                <span className="text-sm font-medium">
                  {link.caregiver?.name}
                </span>
                <form action={revokeCareLink.bind(null, link.id)}>
                  <button
                    type="submit"
                    aria-label="Remover cuidador"
                    className="rounded-full p-1.5 text-navy/40 transition hover:bg-coral/10 hover:text-coral dark:text-white/40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <p className="mb-2 text-sm text-navy/60 dark:text-white/60">
          Convide mais alguém pra acompanhar você:
        </p>
        <CopyReferralLink link={inviteLink} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Você cuida de</h2>
        {peopleICareFor.length === 0 ? (
          <p className="text-sm text-navy/60 dark:text-white/60">
            Você ainda não está acompanhando ninguém. Peça pra quem você
            quer cuidar te enviar o link de convite dele.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {peopleICareFor.map((link, i) => (
              <li
                key={link.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              >
                <div>
                  <p className="text-sm font-medium">{link.titular.name}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${SIGNAL_STYLES[signals[i].level]}`}
                  >
                    {signals[i].message}
                  </span>
                </div>
                <form action={revokeCareLink.bind(null, link.id)}>
                  <button
                    type="submit"
                    aria-label="Parar de acompanhar"
                    className="rounded-full p-1.5 text-navy/40 transition hover:bg-coral/10 hover:text-coral dark:text-white/40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

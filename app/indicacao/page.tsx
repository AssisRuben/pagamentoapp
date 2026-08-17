import Link from "next/link";
import { Gift, Users, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CopyReferralLink from "@/components/CopyReferralLink";

export const dynamic = "force-dynamic";

export default async function IndicacaoPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <Gift className="mb-4 h-10 w-10 text-coral" />
        <h1 className="mb-2 text-xl font-semibold">Indique e Ganhe</h1>
        <p className="mb-6 text-sm text-navy/60 dark:text-white/60">
          Entre na sua conta pra pegar seu link de indicação.
        </p>
        <Link
          href="/login?callbackUrl=/indicacao"
          className="rounded-full bg-coral px-5 py-2.5 text-sm font-medium text-white transition hover:bg-coral-light"
        >
          Entrar
        </Link>
      </main>
    );
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { referralCode: true, _count: { select: { referrals: true } } },
  });

  const link = `${process.env.NEXTAUTH_URL}/?ref=${user.referralCode}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex flex-col items-center rounded-3xl bg-navy p-8 text-center text-white">
        <Gift className="mb-3 h-9 w-9 text-coral" />
        <h1 className="mb-1 text-xl font-semibold">Indique e Ganhe</h1>
        <p className="text-sm text-white/70">
          Compartilhe seu link. Quando um amigo comprar, você acumula
          crédito pra usar nas próximas compras.
        </p>
      </div>

      <p className="mb-2 text-sm font-medium">Seu link de indicação</p>
      <CopyReferralLink link={link} />

      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-card p-5 text-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <Users className="h-6 w-6 text-mint" />
          <p className="text-2xl font-bold">{user._count.referrals}</p>
          <p className="text-xs text-navy/60 dark:text-white/60">
            amigo(s) indicado(s)
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl bg-card p-5 text-center shadow-sm ring-1 ring-black/5 dark:ring-white/10">
          <Sparkles className="h-6 w-6 text-coral" />
          <p className="text-2xl font-bold">Em breve</p>
          <p className="text-xs text-navy/60 dark:text-white/60">
            seu saldo de créditos
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-navy/50 dark:text-white/50">
        O crédito por indicação ainda está sendo configurado — em breve você
        vai poder acompanhar e usar seu saldo aqui.
      </p>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { acceptCareInvite } from "@/lib/actions/care";

export const dynamic = "force-dynamic";

export default async function AceitarConvitePage({
  params,
}: PageProps<"/cuidado/convite/[code]">) {
  const { code } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/cuidado/convite/${code}`);
  }

  const link = await prisma.careLink.findUnique({
    where: { inviteCode: code },
    include: { titular: true },
  });

  if (!link) {
    return (
      <ConviteMensagem texto="Esse link de convite não existe ou está incorreto." />
    );
  }
  if (link.status !== "PENDING") {
    return (
      <ConviteMensagem texto="Esse convite já foi usado ou não está mais disponível." />
    );
  }
  if (link.titularId === session.user.id) {
    return (
      <ConviteMensagem texto="Esse é o seu próprio link de convite — compartilhe com quem vai cuidar de você." />
    );
  }

  async function accept() {
    "use server";
    const result = await acceptCareInvite(code);
    if (result.ok) {
      redirect("/cuidado");
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <HeartHandshake className="mb-4 h-10 w-10 text-coral" />
      <h1 className="mb-2 text-xl font-semibold">
        {link.titular.name} quer que você ajude a cuidar da saúde dele(a)
      </h1>
      <p className="mb-6 text-sm text-navy/60 dark:text-white/60">
        Você vai receber só um sinal discreto de como está a reposição dos
        medicamentos de uso contínuo — nunca a lista de compras.
      </p>
      <form action={accept}>
        <button
          type="submit"
          className="rounded-full bg-coral px-6 py-2.5 text-sm font-medium text-white transition hover:bg-coral-light"
        >
          Aceitar e cuidar
        </button>
      </form>
    </main>
  );
}

function ConviteMensagem({ texto }: { texto: string }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <HeartHandshake className="mb-4 h-10 w-10 text-navy/30 dark:text-white/30" />
      <p className="mb-6 text-sm text-navy/60 dark:text-white/60">{texto}</p>
      <Link href="/" className="text-sm underline">
        Voltar pro início
      </Link>
    </main>
  );
}

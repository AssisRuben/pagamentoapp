"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateCode } from "@/lib/codes";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

/**
 * Cria (ou reaproveita) o convite de cuidado do usuário atual como
 * titular. Reaproveitar um convite PENDING existente evita acumular
 * códigos soltos toda vez que a pessoa reabre a tela.
 */
export async function createCareInvite(): Promise<string> {
  const userId = await requireUserId();

  const existing = await prisma.careLink.findFirst({
    where: { titularId: userId, status: "PENDING" },
  });
  if (existing) return existing.inviteCode;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const link = await prisma.careLink.create({
        data: { titularId: userId, inviteCode: generateCode() },
      });
      return link.inviteCode;
    } catch (error) {
      const isUniqueCollision =
        error instanceof Error &&
        "code" in error &&
        (error as { code?: string }).code === "P2002";
      if (!isUniqueCollision || attempt === 4) throw error;
    }
  }
  throw new Error("Não foi possível gerar o convite");
}

export type AcceptCareInviteResult =
  | { ok: true; titularName: string }
  | { ok: false; error: string };

export async function acceptCareInvite(
  code: string
): Promise<AcceptCareInviteResult> {
  const userId = await requireUserId();

  const link = await prisma.careLink.findUnique({
    where: { inviteCode: code },
    include: { titular: true },
  });

  if (!link) return { ok: false, error: "Convite não encontrado." };
  if (link.status !== "PENDING") {
    return { ok: false, error: "Esse convite já foi usado ou cancelado." };
  }
  if (link.titularId === userId) {
    return { ok: false, error: "Você não pode aceitar seu próprio convite." };
  }

  await prisma.careLink.update({
    where: { id: link.id },
    data: { caregiverId: userId, status: "ACTIVE", acceptedAt: new Date() },
  });

  revalidatePath("/cuidado");
  return { ok: true, titularName: link.titular.name };
}

export async function revokeCareLink(linkId: string) {
  const userId = await requireUserId();

  const link = await prisma.careLink.findUnique({ where: { id: linkId } });
  if (!link) return;
  if (link.titularId !== userId && link.caregiverId !== userId) {
    throw new Error("Sem permissão pra encerrar esse vínculo");
  }

  await prisma.careLink.update({
    where: { id: linkId },
    data: { status: "REVOKED" },
  });

  revalidatePath("/cuidado");
}

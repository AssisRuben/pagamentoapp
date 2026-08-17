"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateLabel } from "@/lib/timeline/format";
import { getExtraInfo } from "@/lib/timeline/extraInfo";
import { getReactionStates, type CommentView } from "@/lib/timeline/reactions";
import type { TimelineFeedItem } from "@/components/TimelineCard";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

const CONTENT_PREFIXES = ["fact-", "finance-", "quote-"];

/**
 * Cards de conteúdo do dia não têm linha no banco — sempre pessoal, sem
 * checagem adicional. Conquistas só podem ser curtidas/comentadas pelo
 * próprio dono OU, depois de compartilhadas, por qualquer usuário logado.
 */
async function assertCanInteract(userId: string, itemKey: string) {
  if (CONTENT_PREFIXES.some((prefix) => itemKey.startsWith(prefix))) return;

  const event = await prisma.timelineEvent.findUnique({ where: { id: itemKey } });
  if (!event) return;
  if (event.userId === userId) return;
  if (!event.sharedAt) {
    throw new Error("Essa conquista ainda não foi compartilhada");
  }
}

export async function toggleLike(itemKey: string): Promise<boolean> {
  const userId = await requireUserId();
  await assertCanInteract(userId, itemKey);

  const existing = await prisma.timelineReaction.findUnique({
    where: { userId_itemKey: { userId, itemKey } },
  });

  if (existing) {
    await prisma.timelineReaction.delete({ where: { id: existing.id } });
    revalidatePath("/");
    revalidatePath("/comunidade");
    return false;
  }

  await prisma.timelineReaction.create({ data: { userId, itemKey } });
  revalidatePath("/");
  revalidatePath("/comunidade");
  return true;
}

export async function addComment(
  itemKey: string,
  text: string
): Promise<CommentView> {
  const userId = await requireUserId();
  await assertCanInteract(userId, itemKey);

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Escreva um comentário");

  const comment = await prisma.timelineComment.create({
    data: { userId, itemKey, text: trimmed },
    include: { user: { select: { name: true } } },
  });

  revalidatePath("/");
  revalidatePath("/comunidade");
  return {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    authorName: comment.user.name,
  };
}

export async function deleteComment(id: string): Promise<void> {
  const userId = await requireUserId();

  const comment = await prisma.timelineComment.findUnique({ where: { id } });
  if (!comment || comment.userId !== userId) {
    throw new Error("Sem permissão pra remover esse comentário");
  }

  await prisma.timelineComment.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/comunidade");
}

/**
 * Torna uma conquista pública — consentimento explícito do dono, exigido
 * pela LGPD já que é dado de saúde. Sem isso, a conquista nunca aparece
 * pra outros usuários nem no feed de /comunidade.
 */
export async function shareAchievement(eventId: string): Promise<void> {
  const userId = await requireUserId();

  const event = await prisma.timelineEvent.findUnique({ where: { id: eventId } });
  if (!event || event.userId !== userId) {
    throw new Error("Sem permissão pra compartilhar essa conquista");
  }

  await prisma.timelineEvent.update({
    where: { id: eventId },
    data: { sharedAt: new Date() },
  });

  revalidatePath("/");
  revalidatePath("/comunidade");
}

export async function unshareAchievement(eventId: string): Promise<void> {
  const userId = await requireUserId();

  const event = await prisma.timelineEvent.findUnique({ where: { id: eventId } });
  if (!event || event.userId !== userId) {
    throw new Error("Sem permissão pra alterar essa conquista");
  }

  await prisma.timelineEvent.update({
    where: { id: eventId },
    data: { sharedAt: null },
  });

  revalidatePath("/");
  revalidatePath("/comunidade");
}

export async function getMoreAchievements(
  offset: number,
  limit = 10
): Promise<{ items: TimelineFeedItem[]; hasMore: boolean }> {
  const userId = await requireUserId();

  const events = await prisma.timelineEvent.findMany({
    where: { userId },
    orderBy: { occurredAt: "desc" },
    skip: offset,
    take: limit + 1,
  });

  const hasMore = events.length > limit;
  const page = events.slice(0, limit);
  const reactionStates = await getReactionStates(userId, page.map((e) => e.id));

  const items: TimelineFeedItem[] = page.map((event) => {
    const state = reactionStates[event.id];
    return {
      id: event.id,
      itemKey: event.id,
      kind: "achievement",
      title: event.title,
      message: event.message,
      extra: getExtraInfo(event.type),
      dateLabel: formatDateLabel(event.occurredAt),
      liked: state.likedByMe,
      likeCount: state.likeCount,
      comments: state.comments,
      shareState: event.sharedAt ? "shared" : "shareable",
    };
  });

  return { items, hasMore };
}

export async function getPublicFeed(
  offset: number,
  limit = 10
): Promise<{ items: TimelineFeedItem[]; hasMore: boolean }> {
  const userId = await requireUserId();

  const events = await prisma.timelineEvent.findMany({
    where: { sharedAt: { not: null } },
    orderBy: { sharedAt: "desc" },
    skip: offset,
    take: limit + 1,
    include: { user: { select: { name: true } } },
  });

  const hasMore = events.length > limit;
  const page = events.slice(0, limit);
  const reactionStates = await getReactionStates(userId, page.map((e) => e.id));

  const items: TimelineFeedItem[] = page.map((event) => {
    const state = reactionStates[event.id];
    return {
      id: event.id,
      itemKey: event.id,
      kind: "achievement",
      title: event.title,
      message: event.message,
      extra: getExtraInfo(event.type),
      dateLabel: formatDateLabel(event.sharedAt ?? event.occurredAt),
      liked: state.likedByMe,
      likeCount: state.likeCount,
      comments: state.comments,
      authorName: event.user.name,
    };
  });

  return { items, hasMore };
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateLabel } from "@/lib/timeline/format";
import { getExtraInfo } from "@/lib/timeline/extraInfo";
import { getReactionState, type CommentView } from "@/lib/timeline/reactions";
import type { TimelineFeedItem } from "@/components/TimelineCard";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

export async function toggleLike(itemKey: string): Promise<boolean> {
  const userId = await requireUserId();

  const existing = await prisma.timelineReaction.findUnique({
    where: { userId_itemKey: { userId, itemKey } },
  });

  if (existing) {
    await prisma.timelineReaction.delete({ where: { id: existing.id } });
    revalidatePath("/");
    return false;
  }

  await prisma.timelineReaction.create({ data: { userId, itemKey } });
  revalidatePath("/");
  return true;
}

export async function addComment(
  itemKey: string,
  text: string
): Promise<CommentView> {
  const userId = await requireUserId();
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Escreva um comentário");

  const comment = await prisma.timelineComment.create({
    data: { userId, itemKey, text: trimmed },
  });

  revalidatePath("/");
  return {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
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

  const { likedKeys, commentsByKey } = await getReactionState(
    userId,
    page.map((e) => e.id)
  );
  const liked = new Set(likedKeys);

  const items: TimelineFeedItem[] = page.map((event) => ({
    id: event.id,
    itemKey: event.id,
    kind: "achievement",
    title: event.title,
    message: event.message,
    extra: getExtraInfo(event.type),
    dateLabel: formatDateLabel(event.occurredAt),
    liked: liked.has(event.id),
    comments: commentsByKey[event.id] ?? [],
  }));

  return { items, hasMore };
}

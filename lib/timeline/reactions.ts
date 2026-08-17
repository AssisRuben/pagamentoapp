import { prisma } from "@/lib/prisma";

export type CommentView = { id: string; text: string; createdAt: string };

export type ReactionState = {
  likedKeys: string[];
  commentsByKey: Record<string, CommentView[]>;
};

/**
 * Curtidas/comentários são pessoais (só o dono vê/reage ao próprio feed).
 * `itemKeys` mistura ids reais de `TimelineEvent` (conquistas) e chaves
 * sintéticas de cards de conteúdo do dia (ex: "fact-2026-08-17").
 */
export async function getReactionState(
  userId: string,
  itemKeys: string[]
): Promise<ReactionState> {
  if (itemKeys.length === 0) return { likedKeys: [], commentsByKey: {} };

  const [reactions, comments] = await Promise.all([
    prisma.timelineReaction.findMany({
      where: { userId, itemKey: { in: itemKeys } },
      select: { itemKey: true },
    }),
    prisma.timelineComment.findMany({
      where: { userId, itemKey: { in: itemKeys } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const commentsByKey: Record<string, CommentView[]> = {};
  for (const comment of comments) {
    (commentsByKey[comment.itemKey] ??= []).push({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
    });
  }

  return {
    likedKeys: reactions.map((r) => r.itemKey),
    commentsByKey,
  };
}

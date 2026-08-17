import { prisma } from "@/lib/prisma";

export type CommentView = {
  id: string;
  text: string;
  createdAt: string;
  authorName: string;
};

export type ItemReactionState = {
  likeCount: number;
  likedByMe: boolean;
  comments: CommentView[];
};

/**
 * Curtidas/comentários são agregados de TODOS os usuários que interagiram
 * com aquele `itemKey` — antes de uma conquista ser compartilhada, só o
 * próprio dono consegue ver/reagir a ela (ninguém mais sabe que ela
 * existe), então o agregado acaba refletindo só o dono mesmo. Depois de
 * compartilhada, qualquer usuário pode curtir/comentar.
 */
export async function getReactionStates(
  currentUserId: string,
  itemKeys: string[]
): Promise<Record<string, ItemReactionState>> {
  const result: Record<string, ItemReactionState> = {};
  for (const key of itemKeys) {
    result[key] = { likeCount: 0, likedByMe: false, comments: [] };
  }
  if (itemKeys.length === 0) return result;

  const [reactions, comments] = await Promise.all([
    prisma.timelineReaction.findMany({
      where: { itemKey: { in: itemKeys } },
      select: { itemKey: true, userId: true },
    }),
    prisma.timelineComment.findMany({
      where: { itemKey: { in: itemKeys } },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  for (const reaction of reactions) {
    const state = result[reaction.itemKey];
    if (!state) continue;
    state.likeCount += 1;
    if (reaction.userId === currentUserId) state.likedByMe = true;
  }

  for (const comment of comments) {
    result[comment.itemKey]?.comments.push({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      authorName: comment.user.name,
    });
  }

  return result;
}

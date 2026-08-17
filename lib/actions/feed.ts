"use server";

import { auth } from "@/auth";
import { getExtraInfo } from "@/lib/timeline/extraInfo";
import { getReactionStates } from "@/lib/timeline/reactions";
import { todayDateString } from "@/lib/timeline/format";
import { fetchCoverImage, fetchNinjaFacts } from "@/lib/timeline/externalContent";
import { getMoreAchievements } from "@/lib/actions/timeline";
import type { TimelineFeedItem } from "@/components/TimelineCard";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Não autenticado");
  }
  return session.user.id;
}

/**
 * Feed único, estilo Instagram: curiosidades (API Ninjas, até 30/dia) seguidas
 * das conquistas do usuário, tudo na mesma paginação — quem chama só sabe o
 * `offset` acumulado, sem se importar se veio de um lado ou de outro. Usada
 * tanto pra carga inicial da home (offset 0) quanto pro scroll infinito.
 */
export async function getFeed(
  offset: number,
  limit = 10
): Promise<{ items: TimelineFeedItem[]; hasMore: boolean }> {
  const userId = await requireUserId();
  const day = todayDateString();
  const [facts, factImage] = await Promise.all([
    fetchNinjaFacts(),
    fetchCoverImage("curiosidades ciência"),
  ]);

  if (offset < facts.length) {
    const factsSlice = facts.slice(offset, offset + limit);
    const base = factsSlice.map((fact, i) => ({
      id: `content-fact-${offset + i}`,
      itemKey: `fact-${day}-${offset + i}`,
      kind: "content" as const,
      title: "Curiosidade do dia",
      message: fact.text,
      extra: getExtraInfo("content-fact"),
      imageUrl: factImage,
      dateLabel: "Hoje",
    }));

    const reactionStates = await getReactionStates(userId, base.map((item) => item.itemKey));
    const factItems: TimelineFeedItem[] = base.map((item) => {
      const state = reactionStates[item.itemKey];
      return { ...item, liked: state.likedByMe, likeCount: state.likeCount, comments: state.comments };
    });

    const remaining = limit - factItems.length;
    if (remaining > 0) {
      const { items: achievementItems, hasMore } = await getMoreAchievements(0, remaining);
      return {
        items: [...factItems, ...achievementItems],
        hasMore: hasMore || offset + factItems.length < facts.length,
      };
    }
    return { items: factItems, hasMore: true };
  }

  return getMoreAchievements(offset - facts.length, limit);
}

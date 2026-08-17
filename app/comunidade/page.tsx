import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import TimelineFeed from "@/components/TimelineFeed";
import type { TimelineFeedItem } from "@/components/TimelineCard";
import { formatDateLabel } from "@/lib/timeline/format";
import { getExtraInfo } from "@/lib/timeline/extraInfo";
import { getReactionStates } from "@/lib/timeline/reactions";
import { getPublicFeed } from "@/lib/actions/timeline";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function ComunidadePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const events = await prisma.timelineEvent.findMany({
    where: { sharedAt: { not: null } },
    orderBy: { sharedAt: "desc" },
    take: PAGE_SIZE + 1,
    include: { user: { select: { name: true } } },
  });
  const hasMore = events.length > PAGE_SIZE;
  const page = events.slice(0, PAGE_SIZE);

  const reactionStates = await getReactionStates(session.user.id, page.map((e) => e.id));

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

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold">Comunidade</h1>
      <p className="mb-6 text-sm text-navy/60 dark:text-white/60">
        Conquistas que outras pessoas escolheram compartilhar. Celebre junto!
      </p>

      {items.length === 0 ? (
        <p className="text-navy/60 dark:text-white/60">
          Ninguém compartilhou conquistas ainda. Seja o primeiro na sua
          timeline!
        </p>
      ) : (
        <TimelineFeed
          initialItems={items}
          initialHasMore={hasMore}
          loadMore={getPublicFeed}
        />
      )}
    </main>
  );
}

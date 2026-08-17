import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import DailyChecklist, { type ChecklistItemView } from "@/components/DailyChecklist";
import TimelineFeed from "@/components/TimelineFeed";
import type { TimelineFeedItem } from "@/components/TimelineCard";
import { formatDateLabel, todayDate, todayDateString } from "@/lib/timeline/format";
import { getExtraInfo } from "@/lib/timeline/extraInfo";
import { getReactionStates } from "@/lib/timeline/reactions";
import { getMoreAchievements } from "@/lib/actions/timeline";
import {
  fetchCoverImage,
  fetchFinanceSnippet,
  fetchFunQuote,
  fetchWellnessFact,
} from "@/lib/timeline/externalContent";

export const dynamic = "force-dynamic";

const ACHIEVEMENTS_PAGE_SIZE = 10;

async function getChecklistData(userId: string): Promise<ChecklistItemView[]> {
  const items = await prisma.careChecklistItem.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
  if (items.length === 0) return [];

  const completions = await prisma.careChecklistCompletion.findMany({
    where: { itemId: { in: items.map((i) => i.id) }, date: todayDate() },
    select: { itemId: true },
  });
  const completedIds = new Set(completions.map((c) => c.itemId));

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    completedToday: completedIds.has(item.id),
  }));
}

async function getContentItems(userId: string): Promise<TimelineFeedItem[]> {
  const day = todayDateString();
  const [fact, finance, quote, healthImage, financeImage, funImage] = await Promise.all([
    fetchWellnessFact(),
    fetchFinanceSnippet(),
    fetchFunQuote(),
    fetchCoverImage("saúde bem-estar"),
    fetchCoverImage("dinheiro finanças"),
    fetchCoverImage("motivação"),
  ]);

  const candidates: Omit<TimelineFeedItem, "liked" | "likeCount" | "comments">[] = [];
  if (fact) {
    candidates.push({
      id: "content-fact",
      itemKey: `fact-${day}`,
      kind: "content",
      title: "Curiosidade do dia",
      message: fact.text,
      extra: getExtraInfo("content-fact"),
      imageUrl: healthImage,
      dateLabel: "Hoje",
    });
  }
  if (finance) {
    candidates.push({
      id: "content-finance",
      itemKey: `finance-${day}`,
      kind: "content",
      title: "Mercado hoje",
      message: finance.text,
      extra: getExtraInfo("content-finance"),
      imageUrl: financeImage,
      dateLabel: "Hoje",
    });
  }
  if (quote) {
    candidates.push({
      id: "content-quote",
      itemKey: `quote-${day}`,
      kind: "content",
      title: "Frase do dia",
      message: `"${quote.text}" — ${quote.author}`,
      extra: getExtraInfo("content-quote"),
      imageUrl: funImage,
      dateLabel: "Hoje",
    });
  }

  const reactionStates = await getReactionStates(userId, candidates.map((c) => c.itemKey));

  return candidates.map((c) => {
    const state = reactionStates[c.itemKey];
    return { ...c, liked: state.likedByMe, likeCount: state.likeCount, comments: state.comments };
  });
}

async function getInitialAchievements(
  userId: string
): Promise<{ items: TimelineFeedItem[]; hasMore: boolean }> {
  const events = await prisma.timelineEvent.findMany({
    where: { userId },
    orderBy: { occurredAt: "desc" },
    take: ACHIEVEMENTS_PAGE_SIZE + 1,
  });
  const hasMore = events.length > ACHIEVEMENTS_PAGE_SIZE;
  const page = events.slice(0, ACHIEVEMENTS_PAGE_SIZE);

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

export default async function HomePage() {
  const session = await auth();

  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  let dbError = false;
  let checklistItems: ChecklistItemView[] = [];
  let contentItems: TimelineFeedItem[] = [];
  let initialAchievements: TimelineFeedItem[] = [];
  let achievementsHasMore = false;

  try {
    const results = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
      session?.user?.id ? getChecklistData(session.user.id) : Promise.resolve([]),
      session?.user?.id
        ? getContentItems(session.user.id)
        : Promise.resolve([] as TimelineFeedItem[]),
      session?.user?.id
        ? getInitialAchievements(session.user.id)
        : Promise.resolve({ items: [], hasMore: false }),
    ]);
    products = results[0];
    checklistItems = results[1];
    contentItems = results[2];
    initialAchievements = results[3].items;
    achievementsHasMore = results[3].hasMore;
  } catch (error) {
    console.error("Erro ao carregar catálogo:", error);
    dbError = true;
  }

  const destaques = products.slice(0, Math.ceil(products.length / 2));
  const maisVendidos = products.slice(Math.ceil(products.length / 2));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      {session?.user?.id && (
        <>
          <DailyChecklist items={checklistItems} />
          <TimelineFeed
            pinnedItems={contentItems}
            initialItems={initialAchievements}
            initialHasMore={achievementsHasMore}
            loadMore={getMoreAchievements}
          />
        </>
      )}

      <Link
        href="/indicacao"
        className="mb-8 flex items-center justify-between rounded-2xl bg-navy px-5 py-4 text-white shadow-sm transition hover:bg-navy-light"
      >
        <div>
          <p className="font-semibold">Indique e ganhe créditos 🎁</p>
          <p className="text-sm text-white/70">
            Compartilhe seu link e acumule cashback a cada indicação
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-coral" />
      </Link>

      {dbError ? (
        <p className="text-coral">
          Não foi possível carregar o catálogo agora. Tente novamente em
          instantes.
        </p>
      ) : products.length === 0 ? (
        <p className="text-navy/60 dark:text-white/60">
          Nenhum produto cadastrado ainda.
        </p>
      ) : (
        <>
          {destaques.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold">Destaques</h2>
              <div className="snap-row">
                {destaques.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-40" />
                ))}
              </div>
            </section>
          )}

          {maisVendidos.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold">Mais vendidos</h2>
              <div className="snap-row">
                {maisVendidos.map((product) => (
                  <ProductCard key={product.id} product={product} className="w-40" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

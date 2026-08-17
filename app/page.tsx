import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import DailyChecklist, { type ChecklistItemView } from "@/components/DailyChecklist";
import TimelineFeed from "@/components/TimelineFeed";
import type { TimelineFeedItem } from "@/components/TimelineCard";
import { todayDate, todayDateString } from "@/lib/timeline/format";
import { getExtraInfo } from "@/lib/timeline/extraInfo";
import { getReactionStates } from "@/lib/timeline/reactions";
import { getFeed } from "@/lib/actions/feed";
import { fetchCoverImage, fetchFinanceSnippet, fetchFunQuote } from "@/lib/timeline/externalContent";

export const dynamic = "force-dynamic";

const FEED_PAGE_SIZE = 10;

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
    category: item.category,
    timeOfDay: item.timeOfDay,
    completedToday: completedIds.has(item.id),
  }));
}

async function getContentItems(userId: string): Promise<TimelineFeedItem[]> {
  const day = todayDateString();
  const [finance, quote, financeImage, funImage] = await Promise.all([
    fetchFinanceSnippet(),
    fetchFunQuote(),
    fetchCoverImage("dinheiro finanças"),
    fetchCoverImage("motivação"),
  ]);

  const candidates: Omit<TimelineFeedItem, "liked" | "likeCount" | "comments">[] = [];
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

export default async function HomePage() {
  const session = await auth();

  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  let dbError = false;
  let checklistItems: ChecklistItemView[] = [];
  let contentItems: TimelineFeedItem[] = [];
  let initialFeedItems: TimelineFeedItem[] = [];
  let feedHasMore = false;

  try {
    const results = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
      session?.user?.id ? getChecklistData(session.user.id) : Promise.resolve([]),
      session?.user?.id
        ? getContentItems(session.user.id)
        : Promise.resolve([] as TimelineFeedItem[]),
      session?.user?.id
        ? getFeed(0, FEED_PAGE_SIZE)
        : Promise.resolve({ items: [], hasMore: false }),
    ]);
    products = results[0];
    checklistItems = results[1];
    contentItems = results[2];
    initialFeedItems = results[3].items;
    feedHasMore = results[3].hasMore;
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
            initialItems={initialFeedItems}
            initialHasMore={feedHasMore}
            loadMore={getFeed}
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

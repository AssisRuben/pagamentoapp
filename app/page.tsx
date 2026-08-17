import Link from "next/link";
import { Pill, ShoppingBag, Gift, ArrowRight } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import DailyChecklist, { type ChecklistItemView } from "@/components/DailyChecklist";
import TimelineFeed from "@/components/TimelineFeed";
import type { TimelineFeedItem } from "@/components/TimelineCard";
import {
  fetchCoverImage,
  fetchFinanceSnippet,
  fetchFunQuote,
  fetchWellnessFact,
} from "@/lib/timeline/externalContent";

export const dynamic = "force-dynamic";

const CATEGORY_SHORTCUTS = [
  { href: "/medicamentos", label: "Medicamentos", icon: Pill },
  { href: "/produtos", label: "Produtos", icon: ShoppingBag },
  { href: "/indicacao", label: "Indique e Ganhe", icon: Gift },
];

function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatDateLabel(date: Date): string {
  const today = todayDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (target.getTime() === today.getTime()) return "Hoje";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

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

async function getTimelineFeedItems(userId: string): Promise<TimelineFeedItem[]> {
  const [events, fact, finance, quote, healthImage, financeImage, funImage] =
    await Promise.all([
      prisma.timelineEvent.findMany({
        where: { userId },
        orderBy: { occurredAt: "desc" },
        take: 20,
      }),
      fetchWellnessFact(),
      fetchFinanceSnippet(),
      fetchFunQuote(),
      fetchCoverImage("saúde bem-estar"),
      fetchCoverImage("dinheiro finanças"),
      fetchCoverImage("motivação"),
    ]);

  const contentItems: TimelineFeedItem[] = [];
  if (fact) {
    contentItems.push({
      id: "content-fact",
      kind: "content",
      title: "Curiosidade do dia",
      message: fact.text,
      imageUrl: healthImage,
      dateLabel: "Hoje",
    });
  }
  if (finance) {
    contentItems.push({
      id: "content-finance",
      kind: "content",
      title: "Mercado hoje",
      message: finance.text,
      imageUrl: financeImage,
      dateLabel: "Hoje",
    });
  }
  if (quote) {
    contentItems.push({
      id: "content-quote",
      kind: "content",
      title: "Frase do dia",
      message: `"${quote.text}" — ${quote.author}`,
      imageUrl: funImage,
      dateLabel: "Hoje",
    });
  }

  const achievementItems: TimelineFeedItem[] = events.map((event) => ({
    id: event.id,
    kind: "achievement",
    title: event.title,
    message: event.message,
    dateLabel: formatDateLabel(event.occurredAt),
  }));

  return [...contentItems, ...achievementItems];
}

export default async function HomePage() {
  const session = await auth();

  let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];
  let dbError = false;
  let checklistItems: ChecklistItemView[] = [];
  let timelineItems: TimelineFeedItem[] = [];

  try {
    const results = await Promise.all([
      prisma.product.findMany({ orderBy: { createdAt: "asc" } }),
      session?.user?.id ? getChecklistData(session.user.id) : Promise.resolve([]),
      session?.user?.id ? getTimelineFeedItems(session.user.id) : Promise.resolve([]),
    ]);
    products = results[0];
    checklistItems = results[1];
    timelineItems = results[2];
  } catch (error) {
    console.error("Erro ao carregar catálogo:", error);
    dbError = true;
  }

  const destaques = products.slice(0, Math.ceil(products.length / 2));
  const maisVendidos = products.slice(Math.ceil(products.length / 2));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold">Olá! 👋</h1>
      <p className="mb-6 text-sm text-navy/60 dark:text-white/60">
        Tudo pro seu bem-estar, perto de você.
      </p>

      <div className="snap-row mb-8">
        {CATEGORY_SHORTCUTS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex w-28 flex-col items-center gap-2 rounded-2xl bg-card p-4 text-center text-xs font-medium shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md dark:ring-white/10"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/15 text-mint">
              <Icon className="h-5 w-5" />
            </span>
            {label}
          </Link>
        ))}
      </div>

      {session?.user?.id && (
        <>
          <DailyChecklist items={checklistItems} />
          <TimelineFeed items={timelineItems} />
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

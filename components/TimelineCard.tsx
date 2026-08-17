export type TimelineFeedItem = {
  id: string;
  title: string;
  message: string;
  imageUrl?: string | null;
  dateLabel: string;
  kind: "achievement" | "content";
};

export default function TimelineCard({ item }: { item: TimelineFeedItem }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- imagem externa (Unsplash), sem otimização própria necessária pra card decorativo
        <img
          src={item.imageUrl}
          alt=""
          className="h-32 w-full object-cover"
        />
      )}
      <div className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span
            className={`text-xs font-medium ${
              item.kind === "achievement" ? "text-mint" : "text-navy/50 dark:text-white/50"
            }`}
          >
            {item.kind === "achievement" ? "Sua conquista" : item.dateLabel}
          </span>
          {item.kind === "achievement" && (
            <span className="text-xs text-navy/50 dark:text-white/50">{item.dateLabel}</span>
          )}
        </div>
        <h3 className="font-semibold">{item.title}</h3>
        <p className="mt-1 text-sm text-navy/70 dark:text-white/70">{item.message}</p>
      </div>
    </article>
  );
}

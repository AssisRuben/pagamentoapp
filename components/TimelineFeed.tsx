import TimelineCard, { type TimelineFeedItem } from "@/components/TimelineCard";

export default function TimelineFeed({ items }: { items: TimelineFeedItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">Novidades</h2>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

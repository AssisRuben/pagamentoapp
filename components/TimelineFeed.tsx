"use client";

import { useEffect, useRef, useState } from "react";
import TimelineCard, { type TimelineFeedItem } from "@/components/TimelineCard";

export default function TimelineFeed({
  pinnedItems = [],
  initialItems,
  initialHasMore,
  loadMore,
}: {
  pinnedItems?: TimelineFeedItem[];
  initialItems: TimelineFeedItem[];
  initialHasMore: boolean;
  loadMore: (offset: number) => Promise<{ items: TimelineFeedItem[]; hasMore: boolean }>;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || fetchingRef.current) return;
        fetchingRef.current = true;
        loadMore(items.length).then((res) => {
          setItems((prev) => [...prev, ...res.items]);
          setHasMore(res.hasMore);
          fetchingRef.current = false;
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, items.length, loadMore]);

  const allItems = [...pinnedItems, ...items];
  if (allItems.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex flex-col gap-4">
        {allItems.map((item) => (
          <TimelineCard key={item.id} item={item} />
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} className="h-4" />}
    </section>
  );
}

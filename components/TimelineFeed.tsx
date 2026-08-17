"use client";

import { useEffect, useRef, useState } from "react";
import TimelineCard, { type TimelineFeedItem } from "@/components/TimelineCard";
import { getMoreAchievements } from "@/lib/actions/timeline";

export default function TimelineFeed({
  contentItems,
  initialAchievements,
  initialHasMore,
}: {
  contentItems: TimelineFeedItem[];
  initialAchievements: TimelineFeedItem[];
  initialHasMore: boolean;
}) {
  const [achievements, setAchievements] = useState(initialAchievements);
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
        getMoreAchievements(achievements.length).then((res) => {
          setAchievements((prev) => [...prev, ...res.items]);
          setHasMore(res.hasMore);
          fetchingRef.current = false;
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, achievements.length]);

  const allItems = [...contentItems, ...achievements];
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

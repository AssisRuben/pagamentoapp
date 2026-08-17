"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle, ChevronDown } from "lucide-react";
import { addComment, toggleLike } from "@/lib/actions/timeline";

export type CommentItem = { id: string; text: string; createdAt: string };

export type TimelineFeedItem = {
  id: string;
  itemKey: string;
  title: string;
  message: string;
  extra: string;
  imageUrl?: string | null;
  dateLabel: string;
  kind: "achievement" | "content";
  liked: boolean;
  comments: CommentItem[];
};

export default function TimelineCard({ item }: { item: TimelineFeedItem }) {
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(item.liked);
  const [comments, setComments] = useState(item.comments);
  const [commentText, setCommentText] = useState("");

  function handleLike() {
    setLiked((prev) => !prev);
    startTransition(async () => {
      await toggleLike(item.itemKey);
    });
  }

  function handleAddComment(formData: FormData) {
    const text = String(formData.get("text") ?? "");
    if (!text.trim()) return;
    startTransition(async () => {
      const comment = await addComment(item.itemKey, text);
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      {item.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- imagem externa (Unsplash), sem otimização própria necessária pra card decorativo
        <img src={item.imageUrl} alt="" className="h-32 w-full object-cover" />
      )}
      <div className="p-4">
        {item.kind === "achievement" && (
          <span className="mb-1 block text-xs font-medium text-mint">Sua conquista</span>
        )}
        <h3 className="font-semibold">{item.title}</h3>
        <p className="mt-1 text-sm text-navy/70 dark:text-white/70">{item.message}</p>

        {item.extra && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1 text-xs font-medium text-navy/50 hover:text-navy dark:text-white/50 dark:hover:text-white"
            >
              {expanded ? "Ver menos" : "Ver mais"}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </button>
            {expanded && (
              <p className="mt-2 rounded-xl bg-mint/5 p-3 text-sm text-navy/70 dark:text-white/70">
                {item.extra}
              </p>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-4 border-t border-black/5 pt-3 dark:border-white/10">
          <button
            type="button"
            disabled={isPending}
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-50 ${
              liked ? "text-coral" : "text-navy/50 dark:text-white/50"
            }`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-coral" : ""}`} />
            Curtir
          </button>
          <button
            type="button"
            onClick={() => setShowComments((prev) => !prev)}
            className="flex items-center gap-1.5 text-sm font-medium text-navy/50 dark:text-white/50"
          >
            <MessageCircle className="h-4 w-4" />
            {comments.length > 0 ? `${comments.length} comentário${comments.length > 1 ? "s" : ""}` : "Comentar"}
          </button>
        </div>

        {showComments && (
          <div className="mt-3 flex flex-col gap-2">
            {comments.map((comment) => (
              <p
                key={comment.id}
                className="rounded-xl bg-black/[0.03] px-3 py-2 text-sm dark:bg-white/5"
              >
                {comment.text}
              </p>
            ))}
            <form action={handleAddComment} className="flex items-center gap-2">
              <input
                name="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escreva um comentário..."
                className="flex-1 rounded-xl border border-black/10 px-3 py-1.5 text-sm outline-none focus:border-mint dark:border-white/15"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-navy px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Enviar
              </button>
            </form>
          </div>
        )}

        <span className="mt-3 block text-xs text-navy/40 dark:text-white/40">
          {item.dateLabel}
        </span>
      </div>
    </article>
  );
}

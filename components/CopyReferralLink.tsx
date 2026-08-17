"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card p-2 pl-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <input
        readOnly
        value={link}
        className="flex-1 truncate bg-transparent text-sm outline-none"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-coral px-3 py-2 text-sm font-medium text-white transition hover:bg-coral-light"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

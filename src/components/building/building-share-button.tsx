"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BuildingShareButton({ url }: { url: string }) {
  const [toast, setToast] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setToast(true);
      window.setTimeout(() => setToast(false), 3500);
    } catch {
      setToast(true);
      window.setTimeout(() => setToast(false), 3500);
    }
  }

  return (
    <div className="relative">
      <Button type="button" variant="secondary" className="gap-2" onClick={copy}>
        <Share2 size={14} />
        Share
      </Button>
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "absolute right-0 top-full mt-2 z-20 rounded-[6px] border border-stone bg-platinum px-3 py-2 text-[13px] text-ink shadow-pop whitespace-nowrap transition-opacity",
          toast ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        Link copied — share it in your group chat
      </div>
    </div>
  );
}

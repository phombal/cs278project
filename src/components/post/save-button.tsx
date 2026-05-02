"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleBookmark } from "@/app/actions/bookmarks";

interface SaveButtonProps {
  postId: string;
  initialSaved: boolean;
  authed: boolean;
  size?: "sm" | "md";
  withLabel?: boolean;
  className?: string;
}

export function SaveButton({
  postId,
  initialSaved,
  authed,
  size = "sm",
  withLabel = true,
  className,
}: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!authed) {
      window.location.href = "/login";
      return;
    }
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleBookmark({ postId, next });
      if (!res.ok) setSaved(!next);
    });
  }

  const Icon = saved ? BookmarkCheck : Bookmark;
  const iconSize = size === "sm" ? 13 : 15;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? "Unsave post" : "Save post"}
      data-pending={isPending ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1 transition-colors",
        saved ? "text-violet" : "text-slate hover:text-violet",
        className,
      )}
    >
      <Icon size={iconSize} fill={saved ? "currentColor" : "none"} />
      {withLabel && (
        <span className="hidden sm:inline">{saved ? "Saved" : "Save"}</span>
      )}
    </button>
  );
}

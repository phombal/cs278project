"use client";

import { useState, useTransition } from "react";
import { ThumbsUp } from "lucide-react";
import { cn, formatScore } from "@/lib/utils";
import { toggleReviewHelpful } from "@/app/actions/review-helpful";

interface ReviewHelpfulButtonProps {
  postId: string;
  initialCount: number;
  initialMarked: boolean;
  authed: boolean;
  isOwnReview: boolean;
  /** When false, show count but disable interaction (logged-out building page) */
  allowToggle?: boolean;
  className?: string;
}

export function ReviewHelpfulButton({
  postId,
  initialCount,
  initialMarked,
  authed,
  isOwnReview,
  allowToggle = true,
  className,
}: ReviewHelpfulButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [marked, setMarked] = useState(initialMarked);
  const [isPending, startTransition] = useTransition();

  const canInteract =
    allowToggle && authed && !isOwnReview && !isPending;

  function handleClick() {
    if (!canInteract) {
      if (!authed && allowToggle) {
        window.location.href = "/login";
      }
      return;
    }
    const next = !marked;
    const delta = next ? 1 : -1;
    setMarked(next);
    setCount((c) => Math.max(0, c + delta));

    startTransition(async () => {
      const res = await toggleReviewHelpful({ postId });
      if (!res.ok) {
        setMarked(!next);
        setCount((c) => Math.max(0, c - delta));
      }
    });
  }

  const disabledVisual = isOwnReview || (!authed && !allowToggle);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isOwnReview && allowToggle}
      aria-pressed={marked}
      aria-label={
        isOwnReview
          ? "You cannot mark your own review as helpful"
          : marked
            ? "Remove helpful vote"
            : "Mark as helpful"
      }
      data-pending={isPending ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border px-3 py-2 text-[13px] transition-colors min-h-[44px]",
        marked
          ? "border-violet bg-violet/10 text-violet"
          : "border-stone bg-platinum text-slate hover:border-violet-washed hover:text-ink",
        disabledVisual && isOwnReview ? "opacity-40 cursor-not-allowed" : "",
        !authed && allowToggle ? "cursor-pointer" : "",
        className,
      )}
    >
      <ThumbsUp
        size={16}
        className="shrink-0"
        fill={marked ? "currentColor" : "none"}
        strokeWidth={1.5}
      />
      <span className="tabular">
        Helpful ({formatScore(count)})
      </span>
    </button>
  );
}

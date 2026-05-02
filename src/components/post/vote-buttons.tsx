"use client";

import { useTransition, useState } from "react";
import { ArrowBigUp, ArrowBigDown } from "lucide-react";
import { cn, formatScore } from "@/lib/utils";
import { castVote } from "@/app/actions/votes";

interface VoteButtonsProps {
  targetType: "post" | "comment";
  targetId: string;
  initialScore: number;
  initialMyVote: 1 | -1 | 0;
  layout?: "vertical" | "horizontal";
  size?: "sm" | "md";
  authed: boolean;
}

export function VoteButtons({
  targetType,
  targetId,
  initialScore,
  initialMyVote,
  layout = "vertical",
  size = "md",
  authed,
}: VoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [myVote, setMyVote] = useState<1 | -1 | 0>(initialMyVote);
  const [isPending, startTransition] = useTransition();

  function vote(value: 1 | -1) {
    if (!authed) {
      window.location.href = "/login";
      return;
    }
    const newValue: 1 | -1 | 0 = myVote === value ? 0 : value;
    const delta = newValue - myVote;
    const prevVote = myVote;
    const prevScore = score;

    setMyVote(newValue);
    setScore(score + delta);

    startTransition(async () => {
      const res = await castVote({ targetType, targetId, value: newValue });
      if (!res.ok) {
        setMyVote(prevVote);
        setScore(prevScore);
      }
    });
  }

  const iconSize = size === "sm" ? 16 : 20;
  const containerClasses =
    layout === "vertical"
      ? "flex flex-col items-center"
      : "flex flex-row items-center gap-1";
  const scoreClasses =
    layout === "vertical"
      ? "text-[12px] font-medium tabular my-0.5"
      : "text-[12px] font-medium tabular";

  const scoreColor =
    myVote === 1
      ? "text-violet"
      : myVote === -1
        ? "text-[color:var(--color-warning)]"
        : "text-slate";

  return (
    <div
      className={containerClasses}
      aria-label={`Vote on ${targetType}`}
      data-pending={isPending ? "true" : undefined}
    >
      <button
        type="button"
        onClick={() => vote(1)}
        aria-pressed={myVote === 1}
        aria-label="Upvote"
        className={cn(
          "rounded-[4px] p-0.5 hover:bg-violet/10 transition-colors",
          myVote === 1 ? "text-violet" : "text-ghost hover:text-violet",
        )}
      >
        <ArrowBigUp
          size={iconSize}
          fill={myVote === 1 ? "currentColor" : "none"}
        />
      </button>
      <span className={cn(scoreClasses, scoreColor)}>{formatScore(score)}</span>
      <button
        type="button"
        onClick={() => vote(-1)}
        aria-pressed={myVote === -1}
        aria-label="Downvote"
        className={cn(
          "rounded-[4px] p-0.5 transition-colors",
          myVote === -1
            ? "text-[color:var(--color-warning)] hover:bg-[color:var(--color-warning)]/10"
            : "text-ghost hover:text-[color:var(--color-warning)] hover:bg-[color:var(--color-warning)]/10",
        )}
      >
        <ArrowBigDown
          size={iconSize}
          fill={myVote === -1 ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
}

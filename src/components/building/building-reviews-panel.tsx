"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/time";
import {
  publicAuthorLabel,
  publicProfileSegment,
} from "@/lib/public-profile";
import type { PostWithAuthor } from "@/types/database";
import { ReviewHelpfulButton } from "@/components/post/review-helpful-button";
import {
  Select,
  Label,
} from "@/components/ui/input";

type SerializedPost = Omit<
  PostWithAuthor,
  "created_at" | "updated_at"
> & {
  created_at: string;
  updated_at: string;
};

const DIM_LABELS = [
  ["rating_landlord", "Landlord"],
  ["rating_noise", "Noise"],
  ["rating_safety", "Safety"],
  ["rating_value", "Value"],
  ["rating_commute", "Commute"],
] as const;

export function BuildingReviewsPanel({
  posts,
  viewerUserId,
  authed,
  helpfulMarkedIds,
}: {
  posts: SerializedPost[];
  viewerUserId: string | null;
  authed: boolean;
  helpfulMarkedIds: string[];
}) {
  const helpfulSet = useMemo(
    () => new Set(helpfulMarkedIds),
    [helpfulMarkedIds],
  );

  const affiliations = useMemo(() => {
    const s = new Set<string>();
    for (const p of posts) {
      if (p.affiliation?.trim()) s.add(p.affiliation.trim());
    }
    return Array.from(s).sort();
  }, [posts]);

  const [affFilter, setAffFilter] = useState("");
  const [sort, setSort] = useState<"recent" | "helpful">("recent");

  const filtered = useMemo(() => {
    let rows = posts;
    if (affFilter) {
      rows = rows.filter((p) => (p.affiliation ?? "").trim() === affFilter);
    }
    const sorted = [...rows];
    if (sort === "helpful") {
      sorted.sort((a, b) => {
        if (b.helpful_count !== a.helpful_count)
          return b.helpful_count - a.helpful_count;
        return b.created_at.localeCompare(a.created_at);
      });
    } else {
      sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return sorted;
  }, [posts, affFilter, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex rounded-[6px] border border-stone bg-platinum p-1">
          <button
            type="button"
            onClick={() => setSort("recent")}
            className={cn(
              "rounded-[4px] px-3 py-1.5 text-[13px] transition-colors",
              sort === "recent"
                ? "bg-violet/10 text-violet"
                : "text-slate hover:bg-porcelain hover:text-ink",
            )}
          >
            Most recent
          </button>
          <button
            type="button"
            onClick={() => setSort("helpful")}
            className={cn(
              "rounded-[4px] px-3 py-1.5 text-[13px] transition-colors",
              sort === "helpful"
                ? "bg-violet/10 text-violet"
                : "text-slate hover:bg-porcelain hover:text-ink",
            )}
          >
            Most helpful
          </button>
        </div>

        {affiliations.length > 0 && (
          <div className="flex items-center gap-2">
            <Label htmlFor="aff_filter" className="text-[12px] text-slate shrink-0">
              Filter by affiliation
            </Label>
            <Select
              id="aff_filter"
              value={affFilter}
              onChange={(e) => setAffFilter(e.target.value)}
              className="min-w-[180px] h-9 text-[13px]"
            >
              <option value="">All</option>
              {affiliations.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-4">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="rounded-[6px] border border-stone bg-platinum p-5"
          >
            <header className="flex flex-wrap items-center gap-2 text-[12px] text-slate">
              <Link
                href={`/u/${encodeURIComponent(
                  publicProfileSegment(
                    p.author_anonymous_handle,
                    p.author_username,
                  ),
                )}`}
                className="font-medium text-ink hover:text-violet"
              >
                {publicAuthorLabel(p.author_anonymous_handle)}
              </Link>
              <span className="text-ghost">·</span>
              <time dateTime={p.created_at}>{timeAgo(p.created_at)}</time>
              {p.affiliation?.trim() && (
                <Badge variant="outline" className="text-[11px]">
                  {p.affiliation.trim()}
                </Badge>
              )}
            </header>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {p.rating_overall != null && (
                <span className="inline-flex items-center gap-1 text-[14px] text-ink tabular">
                  <Star
                    size={14}
                    className="text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
                  />
                  {Number(p.rating_overall).toFixed(1)} / 5
                </span>
              )}
              <Badge variant="outline" className="text-[11px]">
                {p.lease_type === "short_term"
                  ? "Short-term"
                  : "Long-term"}
              </Badge>
              <Badge variant="outline" className="text-[11px]">
                {p.furnished ? "Furnished" : "Unfurnished"}
              </Badge>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-2 text-[11px] text-slate sm:grid-cols-5">
              {DIM_LABELS.map(([key, label]) => (
                <div key={key}>
                  <div className="uppercase tracking-[0.04em] text-ghost">
                    {label}
                  </div>
                  <div className="mt-0.5 text-ink tabular">
                    {p[key as keyof SerializedPost] as number}/5
                  </div>
                </div>
              ))}
            </div>

            {p.body && (
              <p className="mt-4 text-[15px] text-ink leading-relaxed whitespace-pre-wrap">
                {p.body}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {authed ? (
                <ReviewHelpfulButton
                  postId={p.id}
                  initialCount={p.helpful_count}
                  initialMarked={helpfulSet.has(p.id)}
                  authed
                  isOwnReview={viewerUserId === p.author_id}
                />
              ) : (
                <>
                  <span className="text-[13px] text-slate tabular">
                    Helpful ({p.helpful_count})
                  </span>
                  <p className="text-[13px] text-slate">
                    <Link href="/login" className="text-violet hover:underline">
                      Sign up
                    </Link>{" "}
                    to leave a review or vote
                  </p>
                </>
              )}
              <Link
                href={`/p/${p.id}`}
                className="text-[13px] text-violet hover:underline ml-auto"
              >
                Open thread
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="text-[14px] text-slate text-center py-8">
          No reviews match this filter.
        </p>
      )}
    </div>
  );
}

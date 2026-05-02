import Link from "next/link";
import { MessageSquare, Star, Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VoteButtons } from "@/components/post/vote-buttons";
import { SaveButton } from "@/components/post/save-button";
import { timeAgo } from "@/lib/time";
import { formatRent, formatScore } from "@/lib/utils";
import type { PostType } from "@/types/database";

export interface PostCardData {
  id: string;
  title: string;
  body: string | null;
  post_type: PostType;
  rating: number | null;
  rent_per_month_cents: number | null;
  building_or_address: string | null;
  neighborhood_slug: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  author_username: string;
  author_display_name: string;
  board_slug: string;
  board_name: string;
}

const postTypeLabel: Record<PostType, string> = {
  discussion: "Discussion",
  review: "Review",
  roommate: "Roommate",
  question: "Question",
};

export function PostCard({
  post,
  myVote = 0,
  myBookmarked = false,
  authed,
  showBoard = true,
}: {
  post: PostCardData;
  myVote?: 1 | -1 | 0;
  myBookmarked?: boolean;
  authed: boolean;
  showBoard?: boolean;
}) {
  return (
    <article className="rounded-[6px] border border-stone bg-platinum hover:border-violet-washed/60 hover:shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-200">
      <div className="flex">
        {/* Left rail with vote */}
        <div className="flex flex-col items-center justify-start py-4 pl-3 pr-2 border-r border-stone bg-porcelain rounded-l-[6px]">
          <VoteButtons
            targetType="post"
            targetId={post.id}
            initialScore={post.score}
            initialMyVote={myVote}
            authed={authed}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 p-4">
          <header className="flex items-center gap-1.5 text-[12px] text-slate flex-wrap">
            {showBoard && (
              <>
                <Link
                  href={`/b/${post.board_slug}`}
                  className="font-medium text-ink hover:text-violet"
                >
                  b/{post.board_slug}
                </Link>
                <span className="text-ghost">·</span>
              </>
            )}
            <span>posted by</span>
            <Link
              href={`/u/${post.author_username}`}
              className="hover:text-violet"
            >
              @{post.author_username}
            </Link>
            <span className="text-ghost">·</span>
            <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
            {post.is_pinned && (
              <Badge variant="violet" className="ml-1">
                Pinned
              </Badge>
            )}
            {post.is_locked && (
              <Badge variant="warning" className="ml-1">
                Locked
              </Badge>
            )}
          </header>

          <Link href={`/p/${post.id}`} className="block mt-1">
            <h3 className="text-[18px] leading-snug font-normal text-ink hover:text-violet transition-colors">
              {post.title}
            </h3>
          </Link>

          {/* Review meta row */}
          {post.post_type === "review" && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {post.rating != null && <RatingStars rating={post.rating} />}
              {post.rent_per_month_cents != null && (
                <span className="inline-flex items-center gap-1 text-[12px] text-slate">
                  <Home size={12} />
                  <span className="tabular">
                    {formatRent(post.rent_per_month_cents)}/mo
                  </span>
                </span>
              )}
              {post.building_or_address && (
                <span className="inline-flex items-center gap-1 text-[12px] text-slate truncate max-w-[280px]">
                  <MapPin size={12} />
                  <span className="truncate">{post.building_or_address}</span>
                </span>
              )}
            </div>
          )}

          {/* Snippet */}
          {post.body && (
            <p className="mt-2 text-[14px] text-slate line-clamp-2 leading-relaxed">
              {post.body}
            </p>
          )}

          {/* Meta footer */}
          <footer className="mt-3 flex items-center gap-3 text-[12px] text-slate">
            <Badge variant="outline">{postTypeLabel[post.post_type]}</Badge>
            <Link
              href={`/p/${post.id}#comments`}
              className="inline-flex items-center gap-1 hover:text-violet"
            >
              <MessageSquare size={13} />
              <span className="tabular">
                {formatScore(post.comment_count)}
              </span>
              <span className="hidden sm:inline">comments</span>
            </Link>
            <SaveButton
              postId={post.id}
              initialSaved={myBookmarked}
              authed={authed}
            />
          </footer>
        </div>
      </div>
    </article>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={
            n <= rating
              ? "text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
              : "text-stone"
          }
        />
      ))}
    </span>
  );
}

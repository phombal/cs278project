import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Star, Home, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VoteButtons } from "@/components/post/vote-buttons";
import { SaveButton } from "@/components/post/save-button";
import { DeletePostButton } from "@/components/post/delete-post-button";
import { timeAgo } from "@/lib/time";
import { formatRent, formatScore } from "@/lib/utils";
import {
  publicAuthorLabel,
  publicProfileSegment,
} from "@/lib/public-profile";
import type { PostType } from "@/types/database";

export interface PostCardData {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  post_type: PostType;
  rating: number | null;
  rating_overall: number | null;
  rent_per_month_cents: number | null;
  building_or_address: string | null;
  address_formatted: string | null;
  google_place_id: string | null;
  neighborhood_slug: string | null;
  lease_type: string | null;
  furnished: boolean | null;
  affiliation: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  author_username: string;
  author_anonymous_handle: string;
  author_display_name: string;
  board_slug: string;
  board_name: string;
  photos: string[] | null;
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
  currentUserId = null,
}: {
  post: PostCardData;
  myVote?: 1 | -1 | 0;
  myBookmarked?: boolean;
  authed: boolean;
  showBoard?: boolean;
  currentUserId?: string | null;
}) {
  const isOwner = !!currentUserId && currentUserId === post.author_id;
  const authorLabel = publicAuthorLabel(post.author_anonymous_handle);
  const profileSeg = publicProfileSegment(
    post.author_anonymous_handle,
    post.author_username,
  );
  const displayRating =
    post.rating_overall != null ? Number(post.rating_overall) : post.rating;
  const addressLine = post.address_formatted ?? post.building_or_address;
  const buildingHref =
    post.google_place_id &&
    `/building/${encodeURIComponent(post.google_place_id)}`;

  return (
    <article className="rounded-[6px] border border-stone bg-platinum hover:border-violet-washed/60 hover:shadow-soft transition-[border-color,box-shadow] duration-200">
      <div className="flex">
        <div className="flex flex-col items-center justify-start py-4 pl-3 pr-2 border-r border-stone bg-porcelain rounded-l-[6px]">
          <VoteButtons
            targetType="post"
            targetId={post.id}
            initialScore={post.score}
            initialMyVote={myVote}
            authed={authed}
          />
        </div>

        <div className="relative flex-1 min-w-0 p-4">
          {isOwner && (
            <DeletePostButton
              postId={post.id}
              postTitle={post.title}
              className="absolute top-3 right-3"
            />
          )}
          <header
            className={`flex items-center gap-1.5 text-[12px] text-slate flex-wrap ${isOwner ? "pr-10" : ""}`}
          >
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
              href={`/u/${encodeURIComponent(profileSeg)}`}
              className="hover:text-violet"
            >
              {authorLabel}
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

          {post.post_type === "review" && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {displayRating != null && (
                <RatingStars rating={Math.round(displayRating)} />
              )}
              {post.rent_per_month_cents != null && (
                <span className="inline-flex items-center gap-1 text-[12px] text-slate">
                  <Home size={12} />
                  <span className="tabular">
                    {formatRent(post.rent_per_month_cents)}/mo
                  </span>
                </span>
              )}
              {addressLine && (
                <span className="inline-flex items-center gap-1 text-[12px] text-slate truncate max-w-[280px]">
                  <MapPin size={12} />
                  {buildingHref ? (
                    <Link
                      href={buildingHref}
                      onClick={(e) => e.stopPropagation()}
                      className="truncate text-violet hover:underline"
                    >
                      {addressLine}
                    </Link>
                  ) : (
                    <span className="truncate">{addressLine}</span>
                  )}
                </span>
              )}
              {post.lease_type && (
                <Badge variant="outline" className="text-[10px]">
                  {post.lease_type === "short_term" ? "Short-term" : "Long-term"}
                </Badge>
              )}
              {post.furnished != null && (
                <Badge variant="outline" className="text-[10px]">
                  {post.furnished ? "Furnished" : "Unfurnished"}
                </Badge>
              )}
              {post.affiliation?.trim() && (
                <Badge variant="neutral" className="text-[10px] normal-case">
                  {post.affiliation.trim()}
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-3 items-start">
            <div className="flex-1 min-w-0">
              {post.body && (
                <p className="mt-2 text-[14px] text-slate line-clamp-2 leading-relaxed">
                  {post.body}
                </p>
              )}
            </div>
            {post.photos && post.photos.length > 0 && (
              <Link href={`/p/${post.id}`} className="flex-shrink-0 mt-2">
                <div className="relative w-20 h-20 rounded-[4px] overflow-hidden border border-stone hover:border-violet transition-colors">
                  <Image
                    src={post.photos[0]}
                    alt="Post thumbnail"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              </Link>
            )}
          </div>

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

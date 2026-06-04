import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  Home as HomeIcon,
  MapPin,
  Calendar,
  ChevronLeft,
  Edit3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VoteButtons } from "@/components/post/vote-buttons";
import { SaveButton } from "@/components/post/save-button";
import { ReviewHelpfulButton } from "@/components/post/review-helpful-button";
import { PhotoGallery } from "@/components/post/photo-gallery";
import { DeletePostButton } from "@/components/post/delete-post-button";
import {
  CommentThread,
  buildCommentTree,
  CommentForm,
} from "@/components/comment/comment-thread";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/time";
import { formatRent } from "@/lib/utils";
import {
  publicAuthorLabel,
  publicProfileSegment,
} from "@/lib/public-profile";
import type {
  CommentWithAuthor,
  PostWithAuthor,
  PostType,
} from "@/types/database";

export const dynamic = "force-dynamic";

const postTypeLabel: Record<PostType, string> = {
  discussion: "Discussion",
  review: "Review",
  roommate: "Roommate",
  question: "Question",
};

interface RouteParams {
  id: string;
}

export default async function PostPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postRaw } = await supabase
    .from("posts_with_author")
    .select("*")
    .eq("id", id)
    .single();

  if (!postRaw) notFound();
  const post = postRaw as PostWithAuthor;

  const { data: commentsRaw } = await supabase
    .from("comments_with_author")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const comments = (commentsRaw ?? []) as CommentWithAuthor[];

  let myPostVote: 1 | -1 | 0 = 0;
  const myCommentVotes = new Map<string, 1 | -1>();
  let myBookmarked = false;
  let myHelpful = false;

  if (user) {
    const allTargetIds = [post.id, ...comments.map((c) => c.id)];
    const [votesRes, bookmarkRes] = await Promise.all([
      supabase
        .from("votes")
        .select("target_type, target_id, value")
        .eq("user_id", user.id)
        .in("target_id", allTargetIds),
      supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .maybeSingle(),
    ]);
    for (const v of votesRes.data ?? []) {
      if (v.target_type === "post" && v.target_id === post.id) {
        myPostVote = v.value as 1 | -1;
      } else if (v.target_type === "comment") {
        myCommentVotes.set(v.target_id, v.value as 1 | -1);
      }
    }
    myBookmarked = !!bookmarkRes.data;

    if (post.post_type === "review") {
      const { data: h } = await supabase
        .from("review_helpful_votes")
        .select("post_id")
        .eq("user_id", user.id)
        .eq("post_id", post.id)
        .maybeSingle();
      myHelpful = !!h;
    }
  }

  const tree = buildCommentTree(
    comments.map((c) => ({
      ...c,
      myVote: myCommentVotes.get(c.id) ?? 0,
    })),
  );

  const authorLabel = publicAuthorLabel(post.author_anonymous_handle);
  const profileSeg = publicProfileSegment(
    post.author_anonymous_handle,
    post.author_username,
  );
  const buildingHref: string | null = post.google_place_id
    ? `/building/${encodeURIComponent(post.google_place_id)}`
    : null;

  return (
    <main className="mx-auto max-w-[920px] px-6 py-6">
      <Link
        href={`/b/${post.board_slug}`}
        className="inline-flex items-center gap-1 text-[13px] text-slate hover:text-violet"
      >
        <ChevronLeft size={14} />
        Back to b/{post.board_slug}
      </Link>

      <article className="mt-3 rounded-[6px] border border-stone bg-platinum">
        <div className="flex">
          <div className="flex flex-col items-center pt-5 pl-3 pr-2 border-r border-stone bg-porcelain rounded-l-[6px]">
            <VoteButtons
              targetType="post"
              targetId={post.id}
              initialScore={post.score}
              initialMyVote={myPostVote}
              authed={!!user}
            />
          </div>
          <div className="relative flex-1 min-w-0 p-5">
            {user && user.id === post.author_id && (
              <DeletePostButton
                postId={post.id}
                postTitle={post.title}
                redirectOnSuccess="/"
                className="absolute top-4 right-4"
              />
            )}
            <header
              className={`flex items-center gap-1.5 text-[12px] text-slate flex-wrap ${user?.id === post.author_id ? "pr-10" : ""}`}
            >
              <Link
                href={`/b/${post.board_slug}`}
                className="font-medium text-ink hover:text-violet"
              >
                b/{post.board_slug}
              </Link>
              <span className="text-ghost">·</span>
              <Avatar
                src={post.author_avatar_url}
                name={authorLabel}
                size={18}
              />
              <Link
                href={`/u/${encodeURIComponent(profileSeg)}`}
                className="hover:text-violet"
              >
                {authorLabel}
              </Link>
              <span className="text-ghost">·</span>
              <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
              <Badge variant="outline" className="ml-1">
                {postTypeLabel[post.post_type]}
              </Badge>
              {post.is_locked && <Badge variant="warning">Locked</Badge>}
            </header>

            <h1 className="mt-2 text-[26px] font-light tracking-tight leading-snug text-ink">
              {post.title}
            </h1>

            {post.post_type === "review" && (
              <ReviewMeta post={post} buildingHref={buildingHref} />
            )}

            {post.body && (
              <div className="prose-body mt-4 whitespace-pre-wrap break-words">
                {post.body}
              </div>
            )}

            {post.photos && post.photos.length > 0 && (
              <div className="mt-4">
                <PhotoGallery photos={post.photos} />
              </div>
            )}

            {post.post_type === "review" && (
              <div className="mt-5">
                <ReviewHelpfulButton
                  postId={post.id}
                  initialCount={post.helpful_count ?? 0}
                  initialMarked={myHelpful}
                  authed={!!user}
                  isOwnReview={!!user && user.id === post.author_id}
                />
              </div>
            )}

            <footer className="mt-5 flex items-center gap-3 text-[12px] text-slate flex-wrap">
              <SaveButton
                postId={post.id}
                initialSaved={myBookmarked}
                authed={!!user}
              />
              {user && user.id === post.author_id && (
                <Link
                  href={`/p/${post.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-stone hover:border-violet hover:text-violet transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" strokeWidth={2} />
                  Edit Post
                </Link>
              )}
            </footer>
          </div>
        </div>
      </article>

      <section
        id="comments"
        className="mt-6 rounded-[6px] border border-stone bg-platinum p-5"
      >
        <h2 className="text-[18px] font-normal text-ink mb-3">
          {post.comment_count === 0
            ? "Add the first comment"
            : `${post.comment_count} comments`}
        </h2>
        {post.is_locked ? (
          <p className="text-[14px] text-slate italic">
            This thread is locked. New comments are disabled.
          </p>
        ) : user ? (
          <CommentForm postId={post.id} authed parentCommentId={null} />
        ) : (
          <p className="text-[14px] text-slate">
            <Link href="/login" className="text-violet hover:underline">
              Log in
            </Link>{" "}
            to join the conversation.
          </p>
        )}
      </section>

      <section className="mt-6">
        <CommentThread
          nodes={tree}
          postId={post.id}
          authed={!!user}
          postLocked={post.is_locked}
          currentUserId={user?.id ?? null}
        />
      </section>
    </main>
  );
}

function ReviewMeta({
  post,
  buildingHref,
}: {
  post: PostWithAuthor;
  buildingHref: string | null;
}) {
  const dims = [
    { label: "Landlord", v: post.rating_landlord },
    { label: "Noise", v: post.rating_noise },
    { label: "Safety", v: post.rating_safety },
    { label: "Value", v: post.rating_value },
    { label: "Commute", v: post.rating_commute },
  ];
  const hasDims = dims.some((d) => d.v != null);

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[6px] border border-stone bg-porcelain p-4">
        {(post.rating_overall != null || post.rating != null) && (
          <Stat
            label="Overall"
            value={
              <span className="inline-flex items-center gap-1 tabular">
                <Star
                  size={14}
                  className="text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
                />
                {post.rating_overall != null
                  ? Number(post.rating_overall).toFixed(1)
                  : post.rating}
                /5
              </span>
            }
          />
        )}
        {post.rent_per_month_cents != null && (
          <Stat
            label="Monthly rent"
            icon={<HomeIcon size={12} />}
            value={
              <span className="tabular">
                {formatRent(post.rent_per_month_cents)}/mo
              </span>
            }
          />
        )}
        {post.location_label_public && (
          <Stat
            label="Location"
            icon={<MapPin size={12} />}
            value={
              buildingHref != null ? (
                <Link
                  href={buildingHref}
                  className="text-violet hover:underline truncate block max-w-full"
                >
                  {post.location_label_public}
                </Link>
              ) : (
                <span className="truncate block max-w-full">
                  {post.location_label_public}
                </span>
              )
            }
          />
        )}
        {post.lease_type && (
          <Stat
            label="Lease"
            value={
              <Badge variant="outline">
                {post.lease_type === "short_term"
                  ? "Short-term (1–6 mo)"
                  : "Long-term (6+ mo)"}
              </Badge>
            }
          />
        )}
        {post.furnished != null && (
          <Stat
            label="Furnished"
            value={<Badge variant="outline">{post.furnished ? "Yes" : "No"}</Badge>}
          />
        )}
        {(post.lease_start || post.lease_end) && (
          <Stat
            label="Lease dates"
            icon={<Calendar size={12} />}
            value={
              <span className="tabular">
                {post.lease_start ?? "?"} → {post.lease_end ?? "?"}
              </span>
            }
          />
        )}
        {post.would_recommend != null && (
          <Stat
            label="Recommend"
            value={
              <Badge variant={post.would_recommend ? "success" : "warning"}>
                {post.would_recommend ? "Yes" : "No"}
              </Badge>
            }
          />
        )}
        {post.affiliation?.trim() && (
          <Stat
            label="Affiliation"
            value={
              <Badge variant="neutral" className="normal-case tracking-normal">
                {post.affiliation.trim()}
              </Badge>
            }
          />
        )}
      </div>

      {hasDims && (
        <div className="rounded-[6px] border border-stone bg-platinum p-4">
          <p className="text-[11px] uppercase tracking-[0.04em] text-ghost mb-3">
            Dimension ratings
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {dims.map(({ label, v }) =>
              v != null ? (
                <div key={label}>
                  <div className="text-[11px] text-slate">{label}</div>
                  <div className="mt-1 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={
                          n <= v
                            ? "text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
                            : "text-stone"
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.04em] text-ghost">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-[14px] text-ink">{value}</div>
    </div>
  );
}

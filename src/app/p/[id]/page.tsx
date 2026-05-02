import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Star,
  Home as HomeIcon,
  MapPin,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { VoteButtons } from "@/components/post/vote-buttons";
import { SaveButton } from "@/components/post/save-button";
import {
  CommentThread,
  buildCommentTree,
  CommentForm,
} from "@/components/comment/comment-thread";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/time";
import { formatRent } from "@/lib/utils";
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

  // Vote map + bookmark state for current user
  let myPostVote: 1 | -1 | 0 = 0;
  const myCommentVotes = new Map<string, 1 | -1>();
  let myBookmarked = false;

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
  }

  const tree = buildCommentTree(
    comments.map((c) => ({
      ...c,
      myVote: myCommentVotes.get(c.id) ?? 0,
    })),
  );

  return (
    <main className="mx-auto max-w-[920px] px-6 py-6">
      <Link
        href={`/b/${post.board_slug}`}
        className="inline-flex items-center gap-1 text-[13px] text-slate hover:text-violet"
      >
        <ChevronLeft size={14} />
        Back to b/{post.board_slug}
      </Link>

      {/* Post body */}
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
          <div className="flex-1 min-w-0 p-5">
            <header className="flex items-center gap-1.5 text-[12px] text-slate flex-wrap">
              <Link
                href={`/b/${post.board_slug}`}
                className="font-medium text-ink hover:text-violet"
              >
                b/{post.board_slug}
              </Link>
              <span className="text-ghost">·</span>
              <Avatar
                src={post.author_avatar_url}
                name={post.author_display_name}
                size={18}
              />
              <Link
                href={`/u/${post.author_username}`}
                className="hover:text-violet"
              >
                @{post.author_username}
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
              <ReviewMeta post={post} />
            )}

            {post.body && (
              <div className="prose-body mt-4 whitespace-pre-wrap break-words">
                {post.body}
              </div>
            )}

            <footer className="mt-5 flex items-center gap-3 text-[12px] text-slate">
              <SaveButton
                postId={post.id}
                initialSaved={myBookmarked}
                authed={!!user}
              />
            </footer>
          </div>
        </div>
      </article>

      {/* Comment composer */}
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

      {/* Comment tree */}
      <section className="mt-6">
        <CommentThread
          nodes={tree}
          postId={post.id}
          authed={!!user}
          postLocked={post.is_locked}
        />
      </section>
    </main>
  );
}

function ReviewMeta({ post }: { post: PostWithAuthor }) {
  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-[6px] border border-stone bg-porcelain p-4">
      {post.rating != null && (
        <Stat
          label="Rating"
          value={
            <span className="inline-flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={14}
                  className={
                    n <= post.rating!
                      ? "text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
                      : "text-stone"
                  }
                />
              ))}
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
      {post.building_or_address && (
        <Stat
          label="Address"
          icon={<MapPin size={12} />}
          value={
            <span className="truncate block max-w-full">
              {post.building_or_address}
            </span>
          }
        />
      )}
      {(post.lease_start || post.lease_end) && (
        <Stat
          label="Lease"
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

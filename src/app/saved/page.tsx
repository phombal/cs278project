import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PostCard, type PostCardData } from "@/components/post/post-card";
import { Button } from "@/components/ui/button";
import { getFeedUserState } from "@/lib/feed";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/saved");

  // Get the user's bookmark IDs first (with timestamps so we can order),
  // then hydrate the posts via the auth-aware view.
  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const bookmarkRows = bookmarks ?? [];
  let postRows: PostCardData[] = [];

  if (bookmarkRows.length > 0) {
    const ids = bookmarkRows.map((b) => b.post_id);
    const { data: posts } = await supabase
      .from("posts_with_author")
      .select("*")
      .in("id", ids)
      .eq("is_deleted", false);

    // Re-order to match bookmark recency
    const byId = new Map(
      ((posts ?? []) as PostCardData[]).map((p) => [p.id, p]),
    );
    postRows = bookmarkRows
      .map((b) => byId.get(b.post_id))
      .filter((p): p is PostCardData => !!p);
  }

  const { voteMap, bookmarkSet } = await getFeedUserState(
    supabase,
    user.id,
    postRows.map((p) => p.id),
  );

  return (
    <main className="mx-auto max-w-[920px] px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.06em] text-ghost">
            Your library
          </p>
          <h1 className="text-[32px] font-light tracking-tight text-ink">
            Saved posts
          </h1>
          <p className="mt-1 text-[14px] text-slate">
            Posts you've bookmarked, most recent first.
          </p>
        </div>
        <Bookmark className="text-violet/60 hidden sm:block" size={28} />
      </header>

      {postRows.length === 0 ? (
        <div className="mt-10 rounded-[6px] border border-dashed border-stone bg-porcelain p-10 text-center">
          <Bookmark className="mx-auto text-violet/60" size={28} />
          <p className="mt-3 text-[16px] text-ink">Nothing saved yet.</p>
          <p className="mt-1 text-[14px] text-slate">
            Tap the <span className="text-violet">Save</span> button on any
            post to bookmark it for later.
          </p>
          <div className="mt-4">
            <Link href="/">
              <Button>Browse home</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {postRows.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              authed
              myVote={voteMap.get(p.id) ?? 0}
              myBookmarked={bookmarkSet.has(p.id)}
              currentUserId={user.id}
            />
          ))}
        </div>
      )}
    </main>
  );
}

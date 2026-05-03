import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedUserState = {
  voteMap: Map<string, 1 | -1>;
  bookmarkSet: Set<string>;
  helpfulSet: Set<string>;
};

/**
 * For a signed-in user + a list of post IDs, fetch the user's vote,
 * bookmark, and review-helpful state in parallel.
 */
export async function getFeedUserState(
  supabase: SupabaseClient,
  userId: string,
  postIds: string[],
): Promise<FeedUserState> {
  if (postIds.length === 0) {
    return {
      voteMap: new Map(),
      bookmarkSet: new Set(),
      helpfulSet: new Set(),
    };
  }

  const [votesRes, bookmarksRes, helpfulRes] = await Promise.all([
    supabase
      .from("votes")
      .select("target_id, value")
      .eq("user_id", userId)
      .eq("target_type", "post")
      .in("target_id", postIds),
    supabase
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
    supabase
      .from("review_helpful_votes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
  ]);

  const voteMap = new Map<string, 1 | -1>(
    (votesRes.data ?? []).map((v) => [v.target_id, v.value as 1 | -1]),
  );
  const bookmarkSet = new Set<string>(
    (bookmarksRes.data ?? []).map((b) => b.post_id),
  );
  const helpfulSet = new Set<string>(
    (helpfulRes.data ?? []).map((h) => h.post_id),
  );

  return { voteMap, bookmarkSet, helpfulSet };
}

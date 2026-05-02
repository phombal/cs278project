import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * For a signed-in user + a list of post IDs, fetch the user's vote and
 * bookmark state in two parallel queries. Returns Maps you can merge into
 * a feed render.
 */
export async function getFeedUserState(
  supabase: SupabaseClient,
  userId: string,
  postIds: string[],
): Promise<{
  voteMap: Map<string, 1 | -1>;
  bookmarkSet: Set<string>;
}> {
  if (postIds.length === 0) {
    return { voteMap: new Map(), bookmarkSet: new Set() };
  }

  const [votesRes, bookmarksRes] = await Promise.all([
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
  ]);

  const voteMap = new Map<string, 1 | -1>(
    (votesRes.data ?? []).map((v) => [v.target_id, v.value as 1 | -1]),
  );
  const bookmarkSet = new Set<string>(
    (bookmarksRes.data ?? []).map((b) => b.post_id),
  );

  return { voteMap, bookmarkSet };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleReviewHelpful(args: {
  postId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("review_helpful_votes")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", args.postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("review_helpful_votes")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", args.postId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("review_helpful_votes").insert({
      user_id: user.id,
      post_id: args.postId,
    });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

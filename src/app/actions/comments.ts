"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createComment(args: {
  postId: string;
  parentCommentId?: string | null;
  body: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const body = args.body.trim();
  if (body.length === 0) return { ok: false, error: "Comment cannot be empty" };
  if (body.length > 10000)
    return { ok: false, error: "Comment is too long (10000 max)" };

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: args.postId,
      parent_comment_id: args.parentCommentId ?? null,
      author_id: user.id,
      body,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/p/${args.postId}`);
  return { ok: true, id: data.id };
}

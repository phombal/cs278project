"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleBookmark(args: {
  postId: string;
  next: boolean;
}): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (args.next) {
    const { error } = await supabase
      .from("bookmarks")
      .upsert(
        { user_id: user.id, post_id: args.postId },
        { onConflict: "user_id,post_id" },
      );
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", args.postId);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/saved");
  return { ok: true, saved: args.next };
}

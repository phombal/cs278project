"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function castVote(args: {
  targetType: "post" | "comment";
  targetId: string;
  value: 1 | -1 | 0;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (args.value === 0) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("user_id", user.id)
      .eq("target_type", args.targetType)
      .eq("target_id", args.targetId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("votes").upsert(
      {
        user_id: user.id,
        target_type: args.targetType,
        target_id: args.targetId,
        value: args.value,
      },
      { onConflict: "user_id,target_type,target_id" },
    );
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

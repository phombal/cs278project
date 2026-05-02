"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PostType } from "@/types/database";

export async function createPost(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const boardSlug = String(formData.get("board") ?? "").trim();
  const postType = String(formData.get("post_type") ?? "discussion") as PostType;
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;

  if (!boardSlug) throw new Error("Pick a board.");
  if (title.length < 5) throw new Error("Title must be at least 5 characters.");
  if (title.length > 300) throw new Error("Title is too long.");

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, neighborhood_slug")
    .eq("slug", boardSlug)
    .single();

  if (boardError || !board) throw new Error("That board doesn't exist.");

  const insertRow: {
    board_id: string;
    author_id: string;
    post_type: PostType;
    title: string;
    body: string | null;
    neighborhood_slug: string | null;
    rating?: number;
    rent_per_month_cents?: number;
    building_or_address?: string;
    would_recommend?: boolean;
    lease_start?: string;
    lease_end?: string;
  } = {
    board_id: board.id,
    author_id: user!.id,
    post_type: postType,
    title,
    body,
    neighborhood_slug: board.neighborhood_slug,
  };

  if (postType === "review") {
    const ratingRaw = formData.get("rating");
    const rating = ratingRaw ? Number(ratingRaw) : null;
    if (!rating || rating < 1 || rating > 5)
      throw new Error("Reviews must include a 1–5 rating.");
    insertRow.rating = rating;

    const rentRaw = formData.get("rent_per_month");
    if (rentRaw) {
      const rent = Number(rentRaw);
      if (!Number.isFinite(rent) || rent < 0)
        throw new Error("Rent must be a non-negative number.");
      insertRow.rent_per_month_cents = Math.round(rent * 100);
    }

    const addr = String(formData.get("building_or_address") ?? "").trim();
    if (addr) insertRow.building_or_address = addr;

    const recommend = formData.get("would_recommend");
    if (recommend != null)
      insertRow.would_recommend = String(recommend) === "true";

    const ls = String(formData.get("lease_start") ?? "").trim();
    const le = String(formData.get("lease_end") ?? "").trim();
    if (ls) insertRow.lease_start = ls;
    if (le) insertRow.lease_end = le;

    const nb = String(formData.get("neighborhood") ?? "").trim();
    if (nb) insertRow.neighborhood_slug = nb;
  }

  const { data: created, error } = await supabase
    .from("posts")
    .insert(insertRow)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/b/${boardSlug}`);
  revalidatePath("/");
  redirect(`/p/${created.id}`);
}

export async function deletePost(postId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("posts")
    .update({ is_deleted: true, body: null, title: "[deleted]" })
    .eq("id", postId)
    .eq("author_id", user.id);
  if (error) return { ok: false };
  revalidatePath("/");
  return { ok: true };
}

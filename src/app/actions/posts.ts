"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LeaseType, PostType } from "@/types/database";
import { uploadPhotosServer } from "@/lib/storage/photos";

function avgFive(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
): number {
  return Math.round(((a + b + c + d + e) / 5) * 100) / 100;
}

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

  const insertRow: Record<string, unknown> = {
    board_id: board.id,
    author_id: user!.id,
    post_type: postType,
    title,
    body,
    neighborhood_slug: board.neighborhood_slug,
  };

  if (postType === "review") {
    const placeId = String(formData.get("google_place_id") ?? "").trim();
    const addressFormatted = String(
      formData.get("address_formatted") ?? "",
    ).trim();
    const latRaw = formData.get("latitude");
    const lngRaw = formData.get("longitude");
    if (!placeId) throw new Error("Choose an address from the suggestions.");
    if (!addressFormatted)
      throw new Error("Address is missing — pick a place again.");

    const rl = Number(formData.get("rating_landlord"));
    const rn = Number(formData.get("rating_noise"));
    const rs = Number(formData.get("rating_safety"));
    const rv = Number(formData.get("rating_value"));
    const rc = Number(formData.get("rating_commute"));
    for (const [v, label] of [
      [rl, "Landlord"],
      [rn, "Noise"],
      [rs, "Safety"],
      [rv, "Value"],
      [rc, "Commute"],
    ] as const) {
      if (!Number.isFinite(v) || v < 1 || v > 5) {
        throw new Error(`Please rate ${label} from 1–5.`);
      }
    }

    const leaseType = String(formData.get("lease_type") ?? "").trim() as
      | LeaseType
      | "";
    if (leaseType !== "short_term" && leaseType !== "long_term") {
      throw new Error("Choose short-term or long-term lease.");
    }

    const furnishedRaw = formData.get("furnished");
    if (furnishedRaw === null || furnishedRaw === "")
      throw new Error("Say whether the place was furnished.");

    insertRow.google_place_id = placeId;
    insertRow.address_formatted = addressFormatted;
    insertRow.building_or_address = addressFormatted;
    if (latRaw != null && String(latRaw).trim() !== "") {
      const lat = Number(latRaw);
      if (Number.isFinite(lat)) insertRow.latitude = lat;
    }
    if (lngRaw != null && String(lngRaw).trim() !== "") {
      const lng = Number(lngRaw);
      if (Number.isFinite(lng)) insertRow.longitude = lng;
    }
    insertRow.rating_landlord = rl;
    insertRow.rating_noise = rn;
    insertRow.rating_safety = rs;
    insertRow.rating_value = rv;
    insertRow.rating_commute = rc;
    insertRow.rating_overall = avgFive(rl, rn, rs, rv, rc);
    insertRow.rating = Math.round(insertRow.rating_overall as number);
    insertRow.lease_type = leaseType;
    insertRow.furnished = String(furnishedRaw) === "true";

    const aff = String(formData.get("affiliation") ?? "").trim().slice(0, 40);
    if (aff) insertRow.affiliation = aff;

    const nb = String(formData.get("neighborhood") ?? "").trim();
    if (nb) insertRow.neighborhood_slug = nb;

    const rentRaw = formData.get("rent_per_month");
    if (rentRaw) {
      const rent = Number(rentRaw);
      if (!Number.isFinite(rent) || rent < 0)
        throw new Error("Rent must be a non-negative number.");
      insertRow.rent_per_month_cents = Math.round(rent * 100);
    }

    const ls = String(formData.get("lease_start") ?? "").trim();
    const le = String(formData.get("lease_end") ?? "").trim();
    if (ls) insertRow.lease_start = ls;
    if (le) insertRow.lease_end = le;

    const recommend = formData.get("would_recommend");
    if (recommend != null)
      insertRow.would_recommend = String(recommend) === "true";
  }

  // Handle photo uploads
  const photoFiles: File[] = [];
  const photoKeys = Array.from(formData.keys()).filter(key => key.startsWith("photo_"));
  
  console.log('[createPost] Found photo keys:', photoKeys);
  
  for (const key of photoKeys) {
    const file = formData.get(key);
    console.log('[createPost] Checking key:', key, 'Type:', typeof file, 'Instance:', file instanceof File, 'Constructor:', file?.constructor?.name);
    
    // Check if it's a File/Blob with content
    if (file && typeof file === 'object' && 'size' in file && 'name' in file) {
      const fileObj = file as File;
      if (fileObj.size > 0) {
        console.log('[createPost] Adding photo:', fileObj.name, fileObj.size);
        photoFiles.push(fileObj);
      } else {
        console.log('[createPost] Skipping empty file:', fileObj.name);
      }
    } else {
      console.log('[createPost] Not a file:', typeof file);
    }
  }

  console.log('[createPost] Total photos to upload:', photoFiles.length);

  let photoUrls: string[] = [];
  if (photoFiles.length > 0) {
    try {
      const { urls, errors } = await uploadPhotosServer(photoFiles, user.id);
      photoUrls = urls;
      
      console.log('[createPost] Upload complete. URLs:', urls.length, 'Errors:', errors.length);
      
      // Log errors but don't fail the post creation
      if (errors.length > 0) {
        console.error('Some photos failed to upload:', errors);
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
      // Continue with post creation even if photos fail
    }
  }

  // Add photos to insert row
  if (photoUrls.length > 0) {
    insertRow.photos = photoUrls;
  }

  console.log('[createPost] Final insertRow.photos:', insertRow.photos);

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

export async function updatePost(
  postId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Verify user owns this post
  const { data: existingPost } = await supabase
    .from("posts")
    .select("id, author_id, photos")
    .eq("id", postId)
    .eq("author_id", user.id)
    .single();

  if (!existingPost) {
    throw new Error("Post not found or you don't have permission to edit it.");
  }

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;

  if (title.length < 5) throw new Error("Title must be at least 5 characters.");
  if (title.length > 300) throw new Error("Title is too long.");

  const updateRow: Record<string, unknown> = {
    title,
    body,
  };

  // Handle photo uploads for new photos
  const photoFiles: File[] = [];
  const photoKeys = Array.from(formData.keys()).filter((key) =>
    key.startsWith("photo_")
  );

  for (const key of photoKeys) {
    const file = formData.get(key);
    if (file instanceof File && file.size > 0) {
      photoFiles.push(file);
    }
  }

  // Get existing photos that should be kept
  const keptPhotos = formData.getAll("kept_photo").map(String);
  let allPhotos = [...keptPhotos];

  // Upload new photos
  if (photoFiles.length > 0) {
    try {
      const { urls, errors } = await uploadPhotosServer(photoFiles, user.id);
      allPhotos.push(...urls);

      if (errors.length > 0) {
        console.error("Some photos failed to upload:", errors);
      }
    } catch (err) {
      console.error("Photo upload failed:", err);
    }
  }

  updateRow.photos = allPhotos;

  console.log('[updatePost] Final updateRow.photos:', updateRow.photos);
  console.log('[updatePost] Updating post:', postId);

  const { error } = await supabase
    .from("posts")
    .update(updateRow)
    .eq("id", postId)
    .eq("author_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/p/${postId}`);
  revalidatePath("/");
  redirect(`/p/${postId}`);
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

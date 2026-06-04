/**
 * Supabase Storage utilities for post photos
 */

import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTOS_PER_POST = 5;

export interface PhotoUploadResult {
  url: string;
  path: string;
}

export interface PhotoUploadError {
  error: string;
  file?: string;
}

/**
 * Validate a photo file before upload
 */
export function validatePhoto(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`;
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }
  
  return null;
}

/**
 * Generate a storage path for a photo
 * Format: user_id/timestamp_random.ext
 */
function generatePhotoPath(userId: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
  
  return `${userId}/${timestamp}_${random}_${sanitized}.${ext}`;
}

/**
 * Upload a single photo to Supabase Storage (server-side)
 */
export async function uploadPhotoServer(
  file: File,
  userId: string
): Promise<PhotoUploadResult> {
  console.log('[uploadPhotoServer] Starting upload:', file.name, file.size);
  const supabase = await createClient();
  
  // Validate
  const validationError = validatePhoto(file);
  if (validationError) {
    console.error('[uploadPhotoServer] Validation failed:', validationError);
    throw new Error(validationError);
  }
  
  // Generate path
  const path = generatePhotoPath(userId, file.name);
  console.log('[uploadPhotoServer] Generated path:', path);
  
  // Convert File to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log('[uploadPhotoServer] Converted to buffer, size:', buffer.length);
  
  // Upload to storage
  console.log('[uploadPhotoServer] Uploading to Supabase Storage...');
  const { data, error } = await supabase.storage
    .from('post-photos')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    console.error('[uploadPhotoServer] Storage upload error:', error);
    throw new Error(`Failed to upload photo: ${error.message}`);
  }
  
  console.log('[uploadPhotoServer] Upload successful, getting public URL...');
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('post-photos')
    .getPublicUrl(data.path);
  
  console.log('[uploadPhotoServer] Public URL:', urlData.publicUrl);
  
  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Upload multiple photos (server-side)
 */
export async function uploadPhotosServer(
  files: File[],
  userId: string
): Promise<{ urls: string[]; errors: PhotoUploadError[] }> {
  if (files.length > MAX_PHOTOS_PER_POST) {
    throw new Error(`Maximum ${MAX_PHOTOS_PER_POST} photos allowed per post`);
  }
  
  const urls: string[] = [];
  const errors: PhotoUploadError[] = [];
  
  for (const file of files) {
    try {
      const result = await uploadPhotoServer(file, userId);
      urls.push(result.url);
    } catch (err) {
      errors.push({
        error: err instanceof Error ? err.message : 'Unknown error',
        file: file.name,
      });
    }
  }
  
  return { urls, errors };
}

/**
 * Upload a single photo (client-side, for progress tracking)
 */
export async function uploadPhotoClient(
  file: File,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<PhotoUploadResult> {
  const supabase = createBrowserClient();
  
  // Validate
  const validationError = validatePhoto(file);
  if (validationError) {
    throw new Error(validationError);
  }
  
  // Generate path
  const path = generatePhotoPath(userId, file.name);
  
  // Upload with progress tracking
  const { data, error } = await supabase.storage
    .from('post-photos')
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });
  
  if (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload photo: ${error.message}`);
  }
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('post-photos')
    .getPublicUrl(data.path);
  
  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(path: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase.storage
    .from('post-photos')
    .remove([path]);
  
  if (error) {
    console.error('Storage delete error:', error);
    throw new Error(`Failed to delete photo: ${error.message}`);
  }
}

/**
 * Delete multiple photos from storage
 */
export async function deletePhotos(paths: string[]): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase.storage
    .from('post-photos')
    .remove(paths);
  
  if (error) {
    console.error('Storage delete error:', error);
    throw new Error(`Failed to delete photos: ${error.message}`);
  }
}

export { MAX_FILE_SIZE, ALLOWED_TYPES, MAX_PHOTOS_PER_POST };

"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { updatePost } from "@/app/actions/posts";
import { cn } from "@/lib/utils";
import type { PostWithAuthor } from "@/types/database";

interface EditPostFormProps {
  post: PostWithAuthor;
}

export function EditPostForm({ post }: EditPostFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [keptPhotos, setKeptPhotos] = useState<string[]>(
    post.photos || []
  );

  const removeExistingPhoto = (url: string) => {
    setKeptPhotos(keptPhotos.filter((p) => p !== url));
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    // Add kept existing photos
    keptPhotos.forEach((url) => {
      formData.append("kept_photo", url);
    });

    // Append new photo files
    photoFiles.forEach((file, idx) => {
      formData.append(`photo_${idx}`, file);
    });

    startTransition(async () => {
      try {
        await updatePost(post.id, formData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not update post";
        if (msg.includes("NEXT_REDIRECT")) return;
        setError(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-[4px] border border-red-300 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={300}
          defaultValue={post.title}
          placeholder="Post title"
        />
      </div>

      <div>
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          name="body"
          rows={8}
          maxLength={40000}
          defaultValue={post.body || ""}
          placeholder="Post content (optional)"
        />
      </div>

      {/* Existing photos */}
      {keptPhotos.length > 0 && (
        <div>
          <Label>Current Photos</Label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {keptPhotos.map((url) => (
              <div
                key={url}
                className="relative aspect-square rounded-[6px] overflow-hidden border border-stone bg-powder group"
              >
                <img
                  src={url}
                  alt="Existing photo"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingPhoto(url)}
                  className={cn(
                    "absolute top-2 right-2 w-7 h-7 rounded-full",
                    "bg-red-600 hover:bg-red-700 text-white",
                    "flex items-center justify-center",
                    "opacity-0 group-hover:opacity-100 transition-opacity"
                  )}
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new photos */}
      <div>
        <Label>Add New Photos (optional)</Label>
        <PhotoUpload
          onChange={setPhotoFiles}
          maxPhotos={5 - keptPhotos.length}
        />
        {keptPhotos.length > 0 && (
          <p className="mt-1 text-[12px] text-slate">
            You can add up to {5 - keptPhotos.length} more photos
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.history.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

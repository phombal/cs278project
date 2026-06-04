"use client";

import { useRef, useState } from "react";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Photo constraints (keep in sync with server-side validation)
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_POST = 5;

interface PhotoPreview {
  id: string;
  file: File;
  url: string;
}

interface PhotoUploadProps {
  onChange?: (files: File[]) => void;
  maxPhotos?: number;
  className?: string;
}

export function PhotoUpload({
  onChange,
  maxPhotos = MAX_PHOTOS_PER_POST,
  className,
}: PhotoUploadProps) {
  const [previews, setPreviews] = useState<PhotoPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setError(null);

    // Check total count
    if (previews.length + files.length > maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    // Validate and create previews
    const newPreviews: PhotoPreview[] = [];
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} is not an image`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(
          `${file.name} is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
        );
        continue;
      }

      // Create preview
      const preview: PhotoPreview = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        url: URL.createObjectURL(file),
      };
      newPreviews.push(preview);
    }

    const updated = [...previews, ...newPreviews];
    setPreviews(updated);
    const fileList = updated.map((p) => p.file);
    console.log('[PhotoUpload] Files selected:', fileList.length, fileList.map(f => `${f.name} (${f.size} bytes)`));
    onChange?.(fileList);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (id: string) => {
    const preview = previews.find((p) => p.id === id);
    if (preview) {
      URL.revokeObjectURL(preview.url);
    }

    const updated = previews.filter((p) => p.id !== id);
    setPreviews(updated);
    onChange?.(updated.map((p) => p.file));
    setError(null);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Upload button */}
      <div>
        <button
          type="button"
          onClick={handleClick}
          disabled={previews.length >= maxPhotos}
          className={cn(
            "inline-flex items-center gap-2 px-4 h-10 rounded-[4px] text-[14px] font-medium",
            "border border-stone transition-all duration-200",
            previews.length >= maxPhotos
              ? "bg-powder text-ghost cursor-not-allowed"
              : "bg-platinum text-ink hover:border-violet hover:text-violet"
          )}
        >
          <Upload className="h-4 w-4" strokeWidth={2} />
          Add Photos ({previews.length}/{maxPhotos})
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-red-50 border border-red-200">
          <span className="text-[12px] text-red-700">{error}</span>
        </div>
      )}

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {previews.map((preview) => (
            <div
              key={preview.id}
              className="relative aspect-square rounded-[6px] overflow-hidden border border-stone bg-powder group"
            >
              <img
                src={preview.url}
                alt={preview.file.name}
                className="w-full h-full object-cover"
              />
              
              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(preview.id)}
                className={cn(
                  "absolute top-2 right-2 w-7 h-7 rounded-full",
                  "bg-ink/80 hover:bg-ink text-platinum",
                  "flex items-center justify-center",
                  "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>

              {/* File info overlay */}
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 p-2",
                  "bg-gradient-to-t from-ink/60 to-transparent",
                  "opacity-0 group-hover:opacity-100 transition-opacity"
                )}
              >
                <p className="text-[10px] text-platinum truncate">
                  {preview.file.name}
                </p>
                <p className="text-[9px] text-platinum/80">
                  {(preview.file.size / 1024).toFixed(0)}KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="text-[12px] text-slate">
        <ImageIcon className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
        JPG, PNG, WebP, or GIF up to {MAX_FILE_SIZE / 1024 / 1024}MB each
      </p>
    </div>
  );
}

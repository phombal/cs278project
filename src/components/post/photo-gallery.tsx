"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  className?: string;
}

export function PhotoGallery({ photos, className }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const nextPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + photos.length) % photos.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (lightboxIndex === null) return;
    
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextPhoto();
    if (e.key === "ArrowLeft") prevPhoto();
  };

  return (
    <>
      {/* Photo grid */}
      <div
        className={cn(
          "grid gap-2",
          photos.length === 1 && "grid-cols-1",
          photos.length === 2 && "grid-cols-2",
          photos.length >= 3 && "grid-cols-2 md:grid-cols-3",
          className
        )}
      >
        {photos.map((url, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => openLightbox(idx)}
            className={cn(
              "relative aspect-square overflow-hidden rounded-[6px]",
              "border border-stone bg-powder",
              "hover:brightness-95 transition-all group",
              photos.length === 1 && "max-h-[400px]"
            )}
          >
            <img
              src={url}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Zoom overlay */}
            <div
              className={cn(
                "absolute inset-0 bg-ink/20",
                "flex items-center justify-center",
                "opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-platinum/90 flex items-center justify-center">
                <ZoomIn className="h-4 w-4 text-ink" strokeWidth={2} />
              </div>
            </div>

            {/* Photo counter for multi-image galleries */}
            {photos.length > 1 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-[4px] bg-ink/70 text-platinum text-[11px] font-medium">
                {idx + 1}/{photos.length}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className={cn(
              "absolute top-4 right-4 z-10",
              "w-10 h-10 rounded-full bg-platinum/20 hover:bg-platinum/30",
              "flex items-center justify-center",
              "text-platinum transition-colors"
            )}
            aria-label="Close lightbox"
          >
            <X className="h-5 w-5" strokeWidth={2.5} />
          </button>

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevPhoto();
                }}
                className={cn(
                  "absolute left-4 z-10",
                  "w-12 h-12 rounded-full bg-platinum/20 hover:bg-platinum/30",
                  "flex items-center justify-center",
                  "text-platinum transition-colors"
                )}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextPhoto();
                }}
                className={cn(
                  "absolute right-4 z-10",
                  "w-12 h-12 rounded-full bg-platinum/20 hover:bg-platinum/30",
                  "flex items-center justify-center",
                  "text-platinum transition-colors"
                )}
                aria-label="Next photo"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
              </button>
            </>
          )}

          {/* Current image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-[6px]"
            />

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-ink/70 text-platinum text-[13px] font-medium">
              {lightboxIndex + 1} / {photos.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

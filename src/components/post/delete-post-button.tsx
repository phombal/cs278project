"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deletePost } from "@/app/actions/posts";
import { cn } from "@/lib/utils";

interface DeletePostButtonProps {
  postId: string;
  postTitle: string;
}

export function DeletePostButton({ postId, postTitle }: DeletePostButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePost(postId);
      if (result.ok) {
        window.location.href = "/";
      } else {
        alert("Failed to delete post");
        setIsDeleting(false);
      }
    } catch (err) {
      alert("Error deleting post");
      setIsDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        Delete Post
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[12px] text-red-600 font-medium">
        Delete "{postTitle.slice(0, 30)}"?
      </span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className={cn(
          "px-3 py-1.5 rounded-[4px] text-[12px] font-medium",
          "bg-red-600 text-white hover:bg-red-700",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors"
        )}
      >
        {isDeleting ? "Deleting..." : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setShowConfirm(false)}
        disabled={isDeleting}
        className="px-3 py-1.5 rounded-[4px] text-[12px] font-medium border border-stone hover:border-violet hover:text-violet transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

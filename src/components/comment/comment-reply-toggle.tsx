"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { CommentForm } from "@/components/comment/comment-form";

export function CommentReplyToggle({
  postId,
  parentCommentId,
  authed,
}: {
  postId: string;
  parentCommentId: string;
  authed: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="mt-2 w-full">
        <CommentForm
          postId={postId}
          parentCommentId={parentCommentId}
          authed={authed}
          compact
          onPosted={() => setOpen(false)}
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        if (!authed) {
          window.location.href = "/login";
          return;
        }
        setOpen(true);
      }}
      className="inline-flex items-center gap-1 text-[12px] text-slate hover:text-violet transition-colors"
    >
      <MessageSquare size={13} />
      Reply
    </button>
  );
}

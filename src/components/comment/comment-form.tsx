"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createComment } from "@/app/actions/comments";

export function CommentForm({
  postId,
  parentCommentId = null,
  authed,
  onPosted,
  compact = false,
}: {
  postId: string;
  parentCommentId?: string | null;
  authed: boolean;
  onPosted?: () => void;
  compact?: boolean;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!authed) {
      window.location.href = "/login";
      return;
    }
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      setError("Write something before posting.");
      return;
    }
    startTransition(async () => {
      const res = await createComment({
        postId,
        parentCommentId,
        body: trimmed,
      });
      if (res.ok) {
        setBody("");
        onPosted?.();
        router.refresh();
      } else {
        setError(res.error ?? "Could not post comment.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          parentCommentId ? "Write a reply…" : "Share your thoughts…"
        }
        rows={compact ? 3 : 4}
        maxLength={10000}
        aria-label="Comment body"
      />
      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-ghost tabular">
          {body.length}/10000
        </span>
        <div className="flex items-center gap-2">
          {parentCommentId && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onPosted?.()}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Posting…" : parentCommentId ? "Reply" : "Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}

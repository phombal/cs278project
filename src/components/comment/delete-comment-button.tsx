"use client";

import { deleteComment } from "@/app/actions/comments";
import { DeleteTrashButton } from "@/components/post/delete-trash-button";

interface DeleteCommentButtonProps {
  commentId: string;
  postId: string;
  body: string;
  className?: string;
}

export function DeleteCommentButton({
  commentId,
  postId,
  body,
  className,
}: DeleteCommentButtonProps) {
  return (
    <DeleteTrashButton
      itemType="comment"
      preview={body}
      className={className}
      onDelete={() => deleteComment(commentId, postId)}
    />
  );
}

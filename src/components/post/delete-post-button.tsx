"use client";

import { deletePost } from "@/app/actions/posts";
import { DeleteTrashButton } from "@/components/post/delete-trash-button";

interface DeletePostButtonProps {
  postId: string;
  postTitle: string;
  className?: string;
  /** Redirect after delete (detail page). Omit to refresh in place (feed cards). */
  redirectOnSuccess?: string;
}

export function DeletePostButton({
  postId,
  postTitle,
  className,
  redirectOnSuccess,
}: DeletePostButtonProps) {
  return (
    <DeleteTrashButton
      itemType="post"
      preview={postTitle}
      className={className}
      onDelete={() => deletePost(postId)}
      onSuccess={
        redirectOnSuccess
          ? () => {
              window.location.href = redirectOnSuccess;
            }
          : undefined
      }
    />
  );
}

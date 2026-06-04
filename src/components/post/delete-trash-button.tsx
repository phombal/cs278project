"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeleteTrashButtonProps {
  /** Short label for aria and confirm dialog (e.g. "post", "comment") */
  itemType: "post" | "comment";
  /** Optional preview text shown in the confirm dialog */
  preview?: string;
  onDelete: () => Promise<{ ok: boolean }>;
  /** Called after a successful delete (defaults to router.refresh) */
  onSuccess?: () => void;
  className?: string;
  disabled?: boolean;
}

export function DeleteTrashButton({
  itemType,
  preview,
  onDelete,
  onSuccess,
  className,
  disabled = false,
}: DeleteTrashButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      const result = await onDelete();
      if (result.ok) {
        setOpen(false);
        if (onSuccess) onSuccess();
        else router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={`Delete ${itemType}`}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px]",
          "text-ghost hover:text-danger hover:bg-danger/5",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet/40 focus-visible:outline-offset-2",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "transition-colors duration-150",
          className,
        )}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>

      <Modal
        open={open}
        onClose={() => !isDeleting && setOpen(false)}
        title={`Delete this ${itemType}?`}
        description={
          preview
            ? `“${preview.slice(0, 80)}${preview.length > 80 ? "…" : ""}” will be removed. This cannot be undone.`
            : `This ${itemType} will be removed. This cannot be undone.`
        }
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isDeleting}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={handleConfirm}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      />
    </>
  );
}

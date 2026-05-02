"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional id for aria-labelledby — auto-generated if omitted */
  labelledBy?: string;
  className?: string;
}

/**
 * Accessible modal:
 *  - Renders into a portal at the body root
 *  - Closes on Esc or scrim click
 *  - Traps focus within the dialog
 *  - Returns focus to the previously focused element on close
 *  - Locks body scroll while open
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  labelledBy,
  className,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function focusFirst() {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables?.[0];
      first?.focus();
    }
    const t = window.setTimeout(focusFirst, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        const focusables =
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-hidden={!open}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(6_27_49_/_0.40)] backdrop-blur-[2px]"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
        aria-describedby={description ? descId : undefined}
        ref={dialogRef}
        className={cn(
          "relative w-full max-w-[480px] rounded-[8px] bg-platinum",
          "border border-stone shadow-[var(--shadow-pop)]",
          "p-6",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-slate hover:bg-porcelain hover:text-ink"
        >
          <X size={16} />
        </button>

        {title && (
          <h2
            id={titleId}
            className="text-[22px] font-light tracking-[-0.01em] text-ink pr-8"
          >
            {title}
          </h2>
        )}
        {description && (
          <p id={descId} className="mt-2 text-[14px] text-slate leading-relaxed">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        {footer && (
          <div className="mt-6 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

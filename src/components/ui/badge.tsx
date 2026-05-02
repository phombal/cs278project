import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "neutral"
  | "violet"
  | "success"
  | "warning"
  | "danger"
  | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-porcelain text-slate border border-stone",
  violet: "bg-violet/10 text-violet border border-violet/20",
  success:
    "bg-transparent text-[color:var(--color-success)] border border-[color:var(--color-success)]/40",
  warning:
    "bg-transparent text-[color:var(--color-warning)] border border-[color:var(--color-warning)]/40",
  danger:
    "bg-transparent text-danger border border-danger/40",
  outline:
    "bg-transparent text-slate border border-stone",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] px-2 py-[3px]",
        "text-[11px] font-medium uppercase tracking-[0.04em]",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function StatusPip({
  className,
  variant = "success",
}: {
  className?: string;
  variant?: "success" | "warning" | "danger" | "neutral";
}) {
  const colors = {
    success: "bg-[color:var(--color-success)]",
    warning: "bg-[color:var(--color-warning)]",
    danger: "bg-danger",
    neutral: "bg-slate",
  } as const;
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        colors[variant],
        className,
      )}
      aria-hidden="true"
    />
  );
}

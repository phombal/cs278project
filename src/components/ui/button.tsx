import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-violet text-platinum hover:brightness-110 active:brightness-95 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-lift)]",
  secondary:
    "bg-platinum text-ink border border-stone hover:bg-porcelain",
  outline:
    "bg-transparent text-violet border border-violet-washed hover:bg-violet/5",
  ghost:
    "bg-transparent text-ink hover:bg-porcelain",
  danger:
    "bg-transparent text-danger border border-danger/30 hover:bg-danger/5",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-6 text-[15px]",
  lg: "h-12 px-7 text-[15px]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "primary", size = "md", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[4px] font-medium",
          "transition-[background-color,box-shadow,filter,transform] duration-150",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
          "whitespace-nowrap select-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);

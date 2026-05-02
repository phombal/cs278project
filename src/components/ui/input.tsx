import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-[4px] border border-stone bg-platinum px-3",
        "text-[15px] text-ink placeholder:text-ghost",
        "transition-[border-color,box-shadow] duration-150",
        "focus:outline-none focus:border-violet focus:shadow-[0_0_0_2px_rgb(83_58_253_/_0.40)]",
        "disabled:opacity-50 disabled:bg-porcelain",
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-[4px] border border-stone bg-platinum px-3 py-2",
        "text-[15px] text-ink placeholder:text-ghost leading-relaxed",
        "transition-[border-color,box-shadow] duration-150",
        "focus:outline-none focus:border-violet focus:shadow-[0_0_0_2px_rgb(83_58_253_/_0.40)]",
        "disabled:opacity-50 disabled:bg-porcelain",
        "resize-y",
        className,
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-[4px] border border-stone bg-platinum px-3 pr-9",
        "text-[15px] text-ink",
        "transition-[border-color,box-shadow] duration-150",
        "focus:outline-none focus:border-violet focus:shadow-[0_0_0_2px_rgb(83_58_253_/_0.40)]",
        "appearance-none bg-no-repeat bg-[right_0.65rem_center] bg-[length:0.85em_0.85em]",
        "bg-[image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2350617a' stroke-width='1.5'><path d='m6 9 6 6 6-6'/></svg>\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-[14px] font-medium text-ink mb-1",
        className,
      )}
      {...props}
    />
  );
}

export function FieldHelp({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-[12px] text-slate", className)}
      {...props}
    />
  );
}

export function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("mt-1 text-[12px] text-danger", className)}
      {...props}
    />
  );
}

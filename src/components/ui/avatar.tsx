import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 24, className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <img
        src={src}
        alt={`${name} avatar`}
        width={size}
        height={size}
        className={cn(
          "rounded-full object-cover bg-porcelain border border-stone",
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={`${name} avatar`}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "bg-violet/10 text-violet font-medium",
        "border border-violet/20",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.floor(size * 0.45)),
      }}
    >
      {initial}
    </span>
  );
}

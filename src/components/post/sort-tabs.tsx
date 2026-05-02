import Link from "next/link";
import { Flame, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortKey = "hot" | "new" | "top";

const tabs: { key: SortKey; label: string; Icon: typeof Flame }[] = [
  { key: "hot", label: "Hot", Icon: Flame },
  { key: "new", label: "New", Icon: Clock },
  { key: "top", label: "Top", Icon: TrendingUp },
];

export function SortTabs({
  active,
  basePath,
}: {
  active: SortKey;
  basePath: string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-[6px] border border-stone bg-platinum p-1">
      {tabs.map(({ key, label, Icon }) => {
        const isActive = key === active;
        const href = `${basePath}${key === "hot" ? "" : `?sort=${key}`}`;
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[13px] transition-colors",
              isActive
                ? "bg-violet/10 text-violet"
                : "text-slate hover:bg-porcelain hover:text-ink",
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

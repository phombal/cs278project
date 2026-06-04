import Link from "next/link";
import { Pin, MapPin, Users, CalendarRange, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { BoardKind } from "@/types/database";

interface BoardLite {
  slug: string;
  name: string;
  kind: BoardKind;
  is_pinned: boolean;
  sort_order: number;
}

const kindIcon: Record<BoardKind, typeof Pin> = {
  megathread: Pin,
  roommates: Users,
  "future-housing": CalendarRange,
  neighborhood: MapPin,
};

export async function BoardsSidebar({
  activeSlug,
  showRules,
}: {
  activeSlug?: string;
  showRules?: boolean;
}) {
  const supabase = await createClient();
  const { data: boards } = await supabase
    .from("boards")
    .select("slug, name, kind, is_pinned, sort_order")
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const all = (boards ?? []) as BoardLite[];
  const pinned = all.filter((b) => b.is_pinned);
  const neighborhoods = all.filter((b) => b.kind === "neighborhood");

  return (
    <aside className="hidden lg:block w-[260px] shrink-0">
      <div className="sticky top-20 flex flex-col gap-6">
        <SectionList
          label="Pinned"
          items={pinned}
          activeSlug={activeSlug}
        />
        <Link
          href={showRules ? "/" : "/?view=rules"}
          className={
            "flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-[14px] transition-colors " +
            (showRules
              ? "bg-violet/10 text-violet"
              : "text-ink hover:bg-porcelain")
          }
        >
          <ScrollText size={14} className={showRules ? "text-violet" : "text-slate"} />
          <span>Community Rules</span>
        </Link>
        <SectionList
          label="Neighborhoods"
          items={neighborhoods}
          activeSlug={activeSlug}
          scrollable
        />
        <p className="px-3 text-[11px] text-ghost leading-relaxed">
          Reviews, advice, and roommate threads for everyone moving to SF for
          the summer or after graduation.
        </p>
      </div>
    </aside>
  );
}

function SectionList({
  label,
  items,
  activeSlug,
  scrollable,
}: {
  label: string;
  items: BoardLite[];
  activeSlug?: string;
  scrollable?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.06em] text-ghost">
        {label}
      </div>
      <nav
        className={
          scrollable
            ? "flex flex-col max-h-[480px] overflow-y-auto pr-1"
            : "flex flex-col"
        }
      >
        {items.map((b) => {
          const Icon = kindIcon[b.kind];
          const isActive = activeSlug === b.slug;
          return (
            <Link
              key={b.slug}
              href={`/b/${b.slug}`}
              className={
                "flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-[14px] transition-colors " +
                (isActive
                  ? "bg-violet/10 text-violet"
                  : "text-ink hover:bg-porcelain")
              }
            >
              <Icon
                size={14}
                className={isActive ? "text-violet" : "text-slate"}
              />
              <span className="truncate">{b.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

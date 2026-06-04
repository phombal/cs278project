import Link from "next/link";
import { Pin, MapPin, Users, CalendarRange, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PostCard, type PostCardData } from "@/components/post/post-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFeedUserState, type FeedUserState } from "@/lib/feed";
import type { BoardKind } from "@/types/database";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
}

interface BoardHit {
  slug: string;
  name: string;
  description: string;
  kind: BoardKind;
  is_pinned: boolean;
}

const kindIcon: Record<BoardKind, typeof Pin> = {
  megathread: Pin,
  roommates: Users,
  "future-housing": CalendarRange,
  neighborhood: MapPin,
};

/**
 * Escape user input for use inside a Postgres `ilike` pattern.
 * `%`, `_`, and `\` have special meaning and must be escaped.
 */
function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  if (!q) {
    return <EmptyShell />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pattern = `%${escapeIlike(q)}%`;

  // Run all queries in parallel.
  const [boardsRes, postsRes] = await Promise.all([
    supabase
      .from("boards")
      .select("slug, name, description, kind, is_pinned")
      .or(
        `slug.ilike.${pattern},name.ilike.${pattern},description.ilike.${pattern}`,
      )
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .limit(12),
    supabase
      .from("posts_with_author")
      .select("*")
      .eq("is_deleted", false)
      .or(`title.ilike.${pattern},body.ilike.${pattern}`)
      .order("score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  const boards = (boardsRes.data ?? []) as BoardHit[];
  const posts = (postsRes.data ?? []) as PostCardData[];

  const { voteMap, bookmarkSet } = (user
    ? await getFeedUserState(
        supabase,
        user.id,
        posts.map((p) => p.id),
      )
    : {
        voteMap: new Map<string, 1 | -1>(),
        bookmarkSet: new Set<string>(),
        helpfulSet: new Set<string>(),
      }) satisfies FeedUserState;

  const totalHits = boards.length + posts.length;

  return (
    <main className="mx-auto max-w-[920px] px-6 py-6">
      <header className="flex flex-col gap-1">
        <p className="text-[12px] uppercase tracking-[0.06em] text-ghost">
          Search
        </p>
        <h1 className="text-[28px] font-light tracking-tight text-ink">
          Results for{" "}
          <span className="text-violet">&ldquo;{q}&rdquo;</span>
        </h1>
        <p className="text-[13px] text-slate tabular">
          {totalHits} match{totalHits === 1 ? "" : "es"} ·{" "}
          {boards.length} board{boards.length === 1 ? "" : "s"} ·{" "}
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </p>
      </header>

      {totalHits === 0 ? (
        <NoResults q={q} />
      ) : (
        <>
          {boards.length > 0 && (
            <section className="mt-8">
              <SectionHeading>Boards</SectionHeading>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {boards.map((b) => (
                  <BoardHitCard key={b.slug} board={b} />
                ))}
              </div>
            </section>
          )}

          {posts.length > 0 && (
            <section className="mt-8">
              <SectionHeading>Posts</SectionHeading>
              <div className="mt-3 flex flex-col gap-3">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    authed={!!user}
                    myVote={voteMap.get(p.id) ?? 0}
                    myBookmarked={bookmarkSet.has(p.id)}
                    currentUserId={user?.id ?? null}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[12px] uppercase tracking-[0.06em] text-ghost font-medium">
      {children}
    </h2>
  );
}

function BoardHitCard({ board }: { board: BoardHit }) {
  const Icon = kindIcon[board.kind];
  return (
    <Link
      href={`/b/${board.slug}`}
      className="group rounded-[6px] border border-stone bg-platinum p-4 hover:border-violet-washed hover:shadow-[var(--shadow-soft)] transition-[border-color,box-shadow]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-[6px] bg-violet/10 text-violet shrink-0">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-ink group-hover:text-violet">
              b/{board.slug}
            </span>
            {board.is_pinned && (
              <Badge variant="outline" className="gap-1">
                <Pin size={9} /> Pinned
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[13px] text-slate line-clamp-2 leading-snug">
            {board.description}
          </p>
        </div>
      </div>
    </Link>
  );
}

function NoResults({ q }: { q: string }) {
  return (
    <div className="mt-10 rounded-[6px] border border-dashed border-stone bg-porcelain p-10 text-center">
      <Search className="mx-auto text-violet/60" size={28} />
      <p className="mt-3 text-[16px] text-ink">
        Nothing turned up for &ldquo;{q}&rdquo;.
      </p>
      <p className="mt-1 text-[14px] text-slate">
        Try a neighborhood name (e.g. <em>mission</em>, <em>tenderloin</em>) or
        a building name.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/">
          <Button variant="secondary">Browse home</Button>
        </Link>
        <Link href="/b/sf-housing">
          <Button>Open the megathread</Button>
        </Link>
      </div>
    </div>
  );
}

function EmptyShell() {
  return (
    <main className="mx-auto max-w-[640px] px-6 py-16 text-center">
      <Search className="mx-auto text-violet/60" size={32} />
      <h1 className="mt-3 text-[28px] font-light tracking-tight text-ink">
        Search
      </h1>
      <p className="mt-2 text-[14px] text-slate">
        Type a neighborhood, building, or topic in the bar above.
      </p>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Pin, MapPin, Users, CalendarRange, PencilLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BoardsSidebar } from "@/components/sidebar/boards-sidebar";
import { PostCard, type PostCardData } from "@/components/post/post-card";
import { SortTabs, type SortKey } from "@/components/post/sort-tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getFeedUserState } from "@/lib/feed";
import type { BoardKind } from "@/types/database";

export const dynamic = "force-dynamic";

interface RouteParams {
  slug: string;
}
interface SearchParams {
  sort?: string;
}

const kindIcon: Record<BoardKind, typeof Pin> = {
  megathread: Pin,
  roommates: Users,
  "future-housing": CalendarRange,
  neighborhood: MapPin,
};

const kindLabel: Record<BoardKind, string> = {
  megathread: "Megathread",
  roommates: "Roommate Finder",
  "future-housing": "Where Will You Live?",
  neighborhood: "Neighborhood",
};

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { sort: rawSort } = await searchParams;
  const sort: SortKey =
    rawSort === "new" || rawSort === "top" ? rawSort : "hot";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!board) notFound();

  // Optional neighborhood for the about-card
  let neighborhoodDescription: string | null = null;
  if (board.neighborhood_slug) {
    const { data: nb } = await supabase
      .from("neighborhoods")
      .select("description")
      .eq("slug", board.neighborhood_slug)
      .single();
    neighborhoodDescription = nb?.description ?? null;
  }

  const ascending = false;
  const orderColumn = sort === "new" ? "created_at" : "score";
  const { data: posts } = await supabase
    .from("posts_with_author")
    .select("*")
    .eq("board_id", board.id)
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order(orderColumn, { ascending })
    .order("created_at", { ascending: false })
    .limit(30);

  const postRows = (posts ?? []) as PostCardData[];

  const { voteMap, bookmarkSet } = user
    ? await getFeedUserState(
        supabase,
        user.id,
        postRows.map((p) => p.id),
      )
    : { voteMap: new Map<string, 1 | -1>(), bookmarkSet: new Set<string>() };

  const KindIcon = kindIcon[board.kind as BoardKind];

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-6">
      {/* Board header banner */}
      <section
        className="rounded-[8px] border border-stone overflow-hidden"
        style={
          board.kind !== "neighborhood"
            ? {
                background:
                  "linear-gradient(135deg, rgba(127,125,252,0.18) 0%, rgba(244,75,204,0.12) 60%, rgba(255,255,255,0) 100%), #ffffff",
              }
            : undefined
        }
      >
        <div className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-[6px] bg-violet/10 text-violet">
              <KindIcon size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="violet">{kindLabel[board.kind as BoardKind]}</Badge>
                {board.is_pinned && (
                  <Badge variant="outline" className="gap-1">
                    <Pin size={10} /> Pinned
                  </Badge>
                )}
              </div>
              <h1 className="mt-1 text-[28px] font-light tracking-tight text-ink">
                b/{board.slug}
              </h1>
              <p className="mt-1 max-w-2xl text-[14px] text-slate leading-relaxed">
                {board.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={{
                pathname: "/submit",
                query: { board: board.slug },
              }}
            >
              <Button>
                <PencilLine size={14} />
                New post
              </Button>
            </Link>
          </div>
        </div>
        {neighborhoodDescription && (
          <div className="border-t border-stone bg-porcelain px-6 py-3 text-[13px] text-slate">
            {neighborhoodDescription}
          </div>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <BoardsSidebar activeSlug={board.slug} />
        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-normal text-ink">Threads</h2>
            <SortTabs active={sort} basePath={`/b/${board.slug}`} />
          </div>

          {postRows.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-stone bg-porcelain p-10 text-center">
              <p className="text-[16px] text-ink">No threads here yet.</p>
              <p className="mt-1 text-[14px] text-slate">
                Be the first to share an experience or kick off a discussion.
              </p>
              <div className="mt-4">
                <Link
                  href={{ pathname: "/submit", query: { board: board.slug } }}
                >
                  <Button>Start the first thread</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {postRows.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  authed={!!user}
                  myVote={voteMap.get(p.id) ?? 0}
                  myBookmarked={bookmarkSet.has(p.id)}
                  showBoard={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight, Home as HomeIcon, Users, Sparkles, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BoardsSidebar } from "@/components/sidebar/boards-sidebar";
import { PostCard, type PostCardData } from "@/components/post/post-card";
import { SortTabs, type SortKey } from "@/components/post/sort-tabs";
import { Button } from "@/components/ui/button";
import { getFeedUserState, type FeedUserState } from "@/lib/feed";

export const dynamic = "force-dynamic";

const sortToOrder: Record<
  SortKey,
  { column: "created_at" | "score"; ascending: boolean }
> = {
  hot: { column: "score", ascending: false },
  new: { column: "created_at", ascending: false },
  top: { column: "score", ascending: false },
};

interface SearchParams {
  sort?: string;
  view?: string;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { sort: rawSort, view } = await searchParams;
  const sort: SortKey =
    rawSort === "new" || rawSort === "top" ? rawSort : "hot";
  const showRules = view === "rules";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const order = sortToOrder[sort];
  const { data: posts } = await supabase
    .from("posts_with_author")
    .select("*")
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order(order.column, { ascending: order.ascending })
    .order("created_at", { ascending: false })
    .limit(30);

  const postRows = (posts ?? []) as PostCardData[];

  // Fetch the current user's votes + bookmarks on these posts in parallel.
  const { voteMap, bookmarkSet } = (user
    ? await getFeedUserState(
        supabase,
        user.id,
        postRows.map((p) => p.id),
      )
    : {
        voteMap: new Map<string, 1 | -1>(),
        bookmarkSet: new Set<string>(),
        helpfulSet: new Set<string>(),
      }) satisfies FeedUserState;

  return (
    <main className="mx-auto max-w-[1240px] px-6 py-8">
      <Hero />
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <BoardsSidebar showRules={showRules} />
        <div className="min-w-0">
          {showRules ? (
            <CommunityRules />
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-[26px] font-light tracking-tight">
                  Latest from across SF
                </h1>
                <SortTabs active={sort} basePath="/" />
              </div>

              {postRows.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="flex flex-col gap-3">
                  {postRows.map((p) => (
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
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Hero() {
  return (
    <section
      className="relative overflow-hidden rounded-[8px] border border-stone p-10 lg:p-14"
      style={{
        background:
          "radial-gradient(120% 120% at 0% 0%, rgba(127,125,252,0.55), rgba(244,75,204,0.35) 35%, rgba(229,237,245,0) 70%), #ffffff",
      }}
    >
      <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-violet">
        SF Housing
      </span>
      <h1 className="mt-3 max-w-2xl text-[44px] lg:text-[56px] font-light leading-[1.05] tracking-[-0.025em] text-ink">
        Real reviews of every block in San Francisco.
      </h1>
      <p className="mt-4 max-w-2xl text-[18px] leading-relaxed text-slate">
        Find a summer sublet. Land your post-grad apartment. Compare
        neighborhoods, dig into building reviews, and meet the people you'll
        live with — all in one Reddit-style forum.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/b/sf-housing">
          <Button size="lg">
            Browse the megathread
            <ArrowRight size={16} />
          </Button>
        </Link>
        <Link href="/b/roommates">
          <Button size="lg" variant="secondary">
            <Users size={16} />
            Find a roommate
          </Button>
        </Link>
        <Link href="/b/future-housing">
          <Button size="lg" variant="ghost">
            <Sparkles size={16} />
            Where will you live?
          </Button>
        </Link>
      </div>
    </section>
  );
}

function CommunityRules() {
  const rules = [
    {
      number: 1,
      title: "Be honest and accurate",
      body: "Share genuine experiences. Don't post fake reviews, inflate ratings, or spread misinformation about buildings, landlords, or neighborhoods.",
    },
    {
      number: 2,
      title: "Respect privacy",
      body: "Don't share other people's personal information — full names, contact details, exact unit numbers, or anything that could identify a private individual without consent.",
    },
    {
      number: 3,
      title: "Keep it civil",
      body: "Critique housing and landlords, not people. No harassment, hate speech, or personal attacks. Disagreements are fine; hostility is not.",
    },
    {
      number: 4,
      title: "No spam or self-promotion",
      body: "Don't post listings, referral links, or ads disguised as reviews. Landlords and property managers must disclose their affiliation.",
    },
    {
      number: 5,
      title: "Stay on topic",
      body: "Posts should relate to SF housing — rentals, neighborhoods, roommates, building conditions, or moving logistics. Off-topic threads may be removed.",
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <ScrollText size={22} className="text-violet" />
        <h1 className="text-[26px] font-light tracking-tight">Community Rules</h1>
      </div>
      <p className="mb-6 text-[15px] text-slate leading-relaxed">
        SF Housing is a community for honest, helpful information about renting in San Francisco.
        These rules keep it useful and safe for everyone.
      </p>
      <div className="flex flex-col gap-3">
        {rules.map((rule) => (
          <div
            key={rule.number}
            className="rounded-[6px] border border-stone bg-white px-5 py-4 flex gap-4"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet/10 text-[12px] font-semibold text-violet">
              {rule.number}
            </span>
            <div>
              <p className="text-[15px] font-medium text-ink">{rule.title}</p>
              <p className="mt-1 text-[14px] text-slate leading-relaxed">{rule.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[6px] border border-dashed border-stone bg-porcelain p-10 text-center">
      <HomeIcon className="mx-auto text-violet/60" size={32} />
      <p className="mt-3 text-[16px] text-ink">No posts yet.</p>
      <p className="mt-1 text-[14px] text-slate">
        Be the first to start a thread for your neighborhood.
      </p>
      <div className="mt-4">
        <Link href="/submit">
          <Button>Start a thread</Button>
        </Link>
      </div>
    </div>
  );
}

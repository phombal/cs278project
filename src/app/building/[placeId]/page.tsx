import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchPlaceDetails } from "@/lib/google-places";
import type { PostWithAuthor } from "@/types/database";
import { BuildingReviewsPanel } from "@/components/building/building-reviews-panel";
import { BuildingShareButton } from "@/components/building/building-share-button";
import { getFeedUserState } from "@/lib/feed";

export const dynamic = "force-dynamic";

type DimKey =
  | "rating_landlord"
  | "rating_noise"
  | "rating_safety"
  | "rating_value"
  | "rating_commute";

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function avg(posts: PostWithAuthor[], key: DimKey): number {
  if (posts.length === 0) return 0;
  const sum = posts.reduce((s, p) => s + (Number(p[key]) || 0), 0);
  return sum / posts.length;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId: raw } = await params;
  const placeId = decodeURIComponent(raw);
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("posts_with_author")
    .select(
      "rating_overall, rating_landlord, rating_noise, rating_safety, google_place_id",
    )
    .eq("google_place_id", placeId)
    .eq("post_type", "review")
    .eq("is_deleted", false);

  const posts = (rows ?? []) as Pick<
    PostWithAuthor,
    "rating_overall" | "rating_landlord" | "rating_noise" | "rating_safety"
  >[];
  const n = posts.length;
  const place = await fetchPlaceDetails(placeId);
  const addr =
    place?.formattedAddress || place?.displayName || "Building";
  const overall =
    n > 0
      ? posts.reduce((s, p) => s + (Number(p.rating_overall) || 0), 0) / n
      : 0;
  const landlord =
    n > 0
      ? posts.reduce((s, p) => s + (Number(p.rating_landlord) || 0), 0) / n
      : 0;
  const noise =
    n > 0
      ? posts.reduce((s, p) => s + (Number(p.rating_noise) || 0), 0) / n
      : 0;
  const safety =
    n > 0
      ? posts.reduce((s, p) => s + (Number(p.rating_safety) || 0), 0) / n
      : 0;

  const title =
    n > 0
      ? `${addr} — ${overall.toFixed(1)}/5 on SF Housing`
      : `${addr} — SF Housing`;
  const description =
    n > 0
      ? `${n} reviews · Landlord ${landlord.toFixed(1)}/5 · Noise ${noise.toFixed(1)}/5 · Safety ${safety.toFixed(1)}/5`
      : `Student housing reviews for San Francisco.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BuildingPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId: raw } = await params;
  const placeId = decodeURIComponent(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postsRaw } = await supabase
    .from("posts_with_author")
    .select("*")
    .eq("google_place_id", placeId)
    .eq("post_type", "review")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  const posts = (postsRaw ?? []) as PostWithAuthor[];

  const place = await fetchPlaceDetails(placeId);
  if (!place && posts.length === 0) {
    notFound();
  }

  const titleText =
    place?.displayName || place?.formattedAddress || "Building";
  const addrLine = place?.formattedAddress ?? "";

  const n = posts.length;
  const overallAvg =
    n > 0
      ? posts.reduce((s, p) => s + (Number(p.rating_overall) || 0), 0) / n
      : 0;

  const dims: { key: DimKey; label: string }[] = [
    { key: "rating_landlord", label: "Landlord" },
    { key: "rating_noise", label: "Noise" },
    { key: "rating_safety", label: "Safety" },
    { key: "rating_value", label: "Value" },
    { key: "rating_commute", label: "Commute" },
  ];

  const shortTerm = posts.filter((p) => p.lease_type === "short_term").length;
  const furnishedN = posts.filter((p) => p.furnished === true).length;
  const pct = (x: number) => (n > 0 ? Math.round((x / n) * 100) : 0);
  const mostRecent =
    n > 0
      ? posts.reduce(
          (acc, p) => (p.created_at > acc ? p.created_at : acc),
          posts[0]!.created_at,
        )
      : "";

  const site = getSiteUrl();
  const shareUrl = `${site}/building/${encodeURIComponent(placeId)}`;

  const postIds = posts.map((p) => p.id);
  const { helpfulSet } = user
    ? await getFeedUserState(supabase, user.id, postIds)
    : { helpfulSet: new Set<string>() };

  const serialized = JSON.parse(JSON.stringify(posts)) as PostWithAuthor[];

  return (
    <main className="mx-auto max-w-[920px] px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px] font-light tracking-tight text-ink">
            {titleText}
          </h1>
          {addrLine && (
            <p className="mt-1 text-[14px] text-slate">{addrLine}</p>
          )}
          {!place && (
            <p className="mt-2 text-[12px] text-ghost">
              Set GOOGLE_MAPS_API_KEY for live building name and address from
              Google.
            </p>
          )}
        </div>
        <BuildingShareButton url={shareUrl} />
      </header>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-[12px] uppercase tracking-[0.04em] text-ghost">
                Overall
              </p>
              <p className="text-[48px] font-light tabular text-ink leading-none mt-1">
                {n > 0 ? overallAvg.toFixed(1) : "—"}
              </p>
              <div className="mt-2 flex items-center gap-0.5" aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={18}
                    className={
                      n > 0 && i <= Math.round(overallAvg)
                        ? "text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
                        : "text-stone"
                    }
                  />
                ))}
              </div>
              <p className="mt-2 text-[14px] text-slate">
                {n === 0
                  ? "No reviews yet"
                  : `from ${n} review${n === 1 ? "" : "s"}`}
              </p>
              {n === 0 && (
                <Link
                  href={`/submit?type=review&placeId=${encodeURIComponent(placeId)}&board=sf-housing`}
                  className="mt-3 inline-block text-[14px] text-violet hover:underline"
                >
                  Be the first to review this building
                </Link>
              )}
            </div>
          </div>

          <h2 className="mt-8 text-[18px] font-normal text-ink">
            Dimension scores
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {dims.map(({ key, label }) => {
              const v = avg(posts, key);
              const pctBar = n > 0 ? (v / 5) * 100 : 0;
              return (
                <li key={key}>
                  <div className="flex items-center justify-between text-[13px] mb-1">
                    <span className="text-ink">{label}</span>
                    <span className="tabular text-slate">
                      {n > 0 ? `${v.toFixed(1)}/5` : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-[4px] bg-powder overflow-hidden border border-stone">
                    <div
                      className="h-full bg-violet/80 rounded-[4px]"
                      style={{ width: `${pctBar}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <h2 className="mt-10 text-[18px] font-normal text-ink">Reviews</h2>
          <div className="mt-4">
            {n > 0 ? (
              <BuildingReviewsPanel
                posts={serialized}
                viewerUserId={user?.id ?? null}
                authed={!!user}
                helpfulMarkedIds={[...helpfulSet]}
              />
            ) : (
              <p className="text-[14px] text-slate py-6">
                Reviews will appear here once neighbors submit them.
              </p>
            )}
          </div>
        </div>

        <aside className="rounded-[6px] border border-stone bg-porcelain p-4 h-fit lg:sticky lg:top-24">
          <h3 className="text-[12px] uppercase tracking-[0.04em] text-ghost">
            At a glance
          </h3>
          <dl className="mt-3 space-y-3 text-[14px]">
            <div>
              <dt className="text-slate text-[12px]">Short-term leases</dt>
              <dd className="text-ink tabular">{n > 0 ? `${pct(shortTerm)}%` : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate text-[12px]">Furnished</dt>
              <dd className="text-ink tabular">{n > 0 ? `${pct(furnishedN)}%` : "—"}</dd>
            </div>
            <div>
              <dt className="text-slate text-[12px]">Most recent review</dt>
              <dd className="text-ink text-[13px]">
                {mostRecent
                  ? new Date(mostRecent).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}

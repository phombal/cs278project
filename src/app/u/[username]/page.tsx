import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PostCard, type PostCardData } from "@/components/post/post-card";
import { getFeedUserState } from "@/lib/feed";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

interface RouteParams {
  username: string;
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const { data: posts } = await supabase
    .from("posts_with_author")
    .select("*")
    .eq("author_id", profile.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(20);

  const postRows = (posts ?? []) as PostCardData[];

  const { voteMap, bookmarkSet } = viewer
    ? await getFeedUserState(
        supabase,
        viewer.id,
        postRows.map((p) => p.id),
      )
    : { voteMap: new Map<string, 1 | -1>(), bookmarkSet: new Set<string>() };

  return (
    <main className="mx-auto max-w-[920px] px-6 py-8">
      <header className="rounded-[8px] border border-stone bg-platinum p-6 flex items-start gap-5">
        <Avatar
          src={profile.avatar_url}
          name={profile.display_name}
          size={64}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[26px] font-light tracking-tight text-ink">
              {profile.display_name}
            </h1>
            <span className="text-[14px] text-slate">@{profile.username}</span>
            {profile.is_looking_for_roommate && (
              <Badge variant="violet">Looking for roommate</Badge>
            )}
            {profile.is_looking_for_housing && (
              <Badge variant="success">House-hunting</Badge>
            )}
          </div>
          {profile.bio && (
            <p className="mt-2 text-[14px] text-slate leading-relaxed">
              {profile.bio}
            </p>
          )}
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-slate">
            <Stat label="Joined" value={timeAgo(profile.created_at) + " ago"} />
            <Stat
              label="Post karma"
              value={<span className="tabular">{profile.post_karma}</span>}
            />
            <Stat
              label="Comment karma"
              value={<span className="tabular">{profile.comment_karma}</span>}
            />
            {profile.future_neighborhood && (
              <Stat
                label="Moving to"
                value={<span className="text-ink">{profile.future_neighborhood}</span>}
              />
            )}
          </dl>
        </div>
      </header>

      <h2 className="mt-8 mb-3 text-[20px] font-normal text-ink">Posts</h2>
      {postRows.length === 0 ? (
        <p className="text-[14px] text-slate">No posts yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {postRows.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              authed={!!viewer}
              myVote={voteMap.get(p.id) ?? 0}
              myBookmarked={bookmarkSet.has(p.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.04em] text-ghost">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

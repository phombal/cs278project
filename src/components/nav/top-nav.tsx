import Link from "next/link";
import { Search, PencilLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { UserMenu } from "@/components/nav/user-menu";
import { publicAuthorLabel } from "@/lib/public-profile";

export async function TopNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, anonymous_handle, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-stone bg-platinum/85 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1240px] items-center gap-6 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[18px] font-medium tracking-tight"
        >
          <span
            className="inline-block h-6 w-6 rounded-[4px]"
            style={{ background: "var(--gradient-dreamy)" }}
            aria-hidden="true"
          />
          <span>SF Housing</span>
        </Link>

        <form
          action="/search"
          className="relative hidden flex-1 max-w-xl md:block"
        >
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost"
            aria-hidden="true"
          />
          <input
            type="search"
            name="q"
            placeholder="Search neighborhoods, posts, roommates…"
            className="h-10 w-full rounded-[4px] border border-stone bg-porcelain pl-9 pr-3 text-[14px] placeholder:text-ghost focus:outline-none focus:border-violet focus:bg-platinum focus:shadow-[0_0_0_2px_rgb(83_58_253_/_0.40)]"
          />
        </form>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/submit">
                <Button size="sm" variant="outline" className="gap-1.5">
                  <PencilLine size={14} />
                  <span className="hidden sm:inline">New post</span>
                </Button>
              </Link>
              <UserMenu
                anonymousHandle={publicAuthorLabel(profile?.anonymous_handle)}
                avatarUrl={profile?.avatar_url ?? null}
              />
            </>
          ) : (
            <>
              <Link href="/login">
                <Button size="sm" variant="ghost">
                  Log in
                </Button>
              </Link>
              <Link href="/login?signup=1">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function GuestAvatar() {
  return <Avatar name="Guest" size={28} />;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Stable "Profile" destination: always resolves the signed-in user's public handle.
 */
export default async function ProfileMeRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/u/me");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("anonymous_handle, username")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <main className="mx-auto max-w-[560px] px-6 py-16">
        <h1 className="text-[22px] font-normal text-ink">Profile unavailable</h1>
        <p className="mt-3 text-[15px] text-slate leading-relaxed">
          We could not load your member profile. This usually means the database
          is missing the latest migration, or your account has no profile row
          yet. Try signing out and back in, or run{" "}
          <code className="text-[13px] text-ink">supabase db push</code> / apply
          migrations to your project.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-[4px] bg-violet px-6 text-[15px] font-medium text-platinum shadow-[var(--shadow-soft)] transition-[filter,box-shadow] hover:brightness-110"
          >
            Back home
          </Link>
          <Link
            href="/login?next=/u/me"
            className="inline-flex h-10 items-center justify-center rounded-[4px] border border-violet-washed px-6 text-[15px] font-medium text-violet hover:bg-violet/5"
          >
            Sign in again
          </Link>
        </div>
      </main>
    );
  }

  const handle =
    (profile.anonymous_handle && String(profile.anonymous_handle).trim()) ||
    profile.username;
  if (!handle) {
    return (
      <main className="mx-auto max-w-[560px] px-6 py-16">
        <h1 className="text-[22px] font-normal text-ink">Profile setup incomplete</h1>
        <p className="mt-3 text-[15px] text-slate leading-relaxed">
          Your account has no public handle yet. Apply the latest Supabase
          migrations (anonymous handle column + backfill), then refresh.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-[4px] bg-violet px-6 text-[15px] font-medium text-platinum shadow-[var(--shadow-soft)] hover:brightness-110"
        >
          Back home
        </Link>
      </main>
    );
  }

  redirect(`/u/${encodeURIComponent(handle)}`);
}

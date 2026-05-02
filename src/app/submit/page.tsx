import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SubmitForm } from "@/app/submit/submit-form";

export const dynamic = "force-dynamic";

interface SearchParams {
  board?: string;
  type?: string;
}

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/submit");

  const { data: boards } = await supabase
    .from("boards")
    .select("slug, name, kind")
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  const { data: neighborhoods } = await supabase
    .from("neighborhoods")
    .select("slug, name")
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto max-w-[760px] px-6 py-8">
      <h1 className="text-[32px] font-light tracking-tight text-ink">
        Start a new thread
      </h1>
      <p className="mt-2 text-[14px] text-slate">
        Pick a board, choose what kind of post you're making, and share what
        you wish someone had told you.
      </p>

      <SubmitForm
        boards={boards ?? []}
        neighborhoods={neighborhoods ?? []}
        defaultBoard={sp.board}
        defaultType={sp.type}
      />
    </main>
  );
}

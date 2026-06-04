import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EditPostForm } from "@/components/post/edit-post-form";
import type { PostWithAuthor } from "@/types/database";

export const dynamic = "force-dynamic";

interface RouteParams {
  id: string;
}

export default async function EditPostPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: postRaw } = await supabase
    .from("posts_with_author")
    .select("*")
    .eq("id", id)
    .single();

  if (!postRaw) notFound();
  const post = postRaw as PostWithAuthor;

  // Only the author can edit
  if (post.author_id !== user.id) {
    redirect(`/p/${id}`);
  }

  return (
    <div className="min-h-screen bg-powder">
      <div className="max-w-[800px] mx-auto px-6 py-8">
        <Link
          href={`/p/${id}`}
          className="inline-flex items-center gap-1.5 text-[14px] text-slate hover:text-violet mb-6"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          Back to post
        </Link>

        <div className="rounded-[6px] border border-stone bg-platinum p-6">
          <h1 className="text-[32px] font-light tracking-tight text-ink mb-6">
            Edit Post
          </h1>

          <EditPostForm post={post} />
        </div>
      </div>
    </div>
  );
}

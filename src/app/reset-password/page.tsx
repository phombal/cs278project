import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/app/reset-password/reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  // The user must be signed in (via the recovery code-exchange that happened
  // on /auth/callback) before they can set a new password.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/forgot-password?expired=1");
  }

  return (
    <main className="mx-auto max-w-[440px] px-6 py-12">
      <h1 className="text-[32px] font-light tracking-tight text-ink text-center">
        Set a new password
      </h1>
      <p className="mt-2 text-[14px] text-slate text-center">
        Pick something you'll remember — at least 8 characters.
      </p>
      <div className="mt-6 rounded-[8px] border border-stone bg-platinum p-6 shadow-[var(--shadow-soft)]">
        <ResetPasswordForm email={user.email ?? ""} />
      </div>
    </main>
  );
}

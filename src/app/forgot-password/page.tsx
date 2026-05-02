import Link from "next/link";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";

export const dynamic = "force-dynamic";

interface SearchParams {
  expired?: string;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { expired } = await searchParams;
  return (
    <main className="mx-auto max-w-[440px] px-6 py-12">
      <h1 className="text-[32px] font-light tracking-tight text-ink text-center">
        Forgot your password?
      </h1>
      <p className="mt-2 text-[14px] text-slate text-center">
        Enter your email and we'll send you a link to set a new one.
      </p>

      {expired && (
        <div
          role="alert"
          className="mt-4 rounded-[6px] border border-[color:var(--color-warning)]/40 bg-[color:var(--color-warning)]/5 px-4 py-2.5 text-[13px] text-ink"
        >
          That reset link expired or was already used. Request a fresh one
          below.
        </div>
      )}

      <div className="mt-6 rounded-[8px] border border-stone bg-platinum p-6 shadow-[var(--shadow-soft)]">
        <ForgotPasswordForm />
      </div>
      <p className="mt-4 text-center text-[13px] text-slate">
        Remembered it?{" "}
        <Link href="/login" className="text-violet hover:underline">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}

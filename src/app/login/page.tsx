import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-[440px] px-6 py-12">
      <h1 className="text-[32px] font-light tracking-tight text-ink text-center">
        Welcome back
      </h1>
      <p className="mt-2 text-[14px] text-slate text-center">
        Sign in with your email and password, or create an account.
      </p>
      <div className="mt-6 rounded-[8px] border border-stone bg-platinum p-6 shadow-[var(--shadow-soft)]">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
      <p className="mt-4 text-center text-[12px] text-ghost">
        By signing in you agree to be excellent to your future neighbors.
      </p>
    </main>
  );
}

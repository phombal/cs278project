"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn, UserPlus, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, FieldHelp } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export function LoginForm() {
  const params = useSearchParams();
  const initialMode: Mode = params.get("signup") === "1" ? "signup" : "signin";
  const next = params.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const cleanedEmail = email.trim().toLowerCase();

    if (mode === "signin") {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password,
      });
      setIsLoading(false);
      if (err) {
        logAuthError("signIn", err);
        setError(friendlyAuthError(err));
        return;
      }
      console.info("[auth] signIn ok", { user: data.user?.id });
      router.refresh();
      router.push(next);
    } else {
      if (password.length < 8) {
        setIsLoading(false);
        setError("Password must be at least 8 characters.");
        return;
      }
      const { data, error: err } = await supabase.auth.signUp({
        email: cleanedEmail,
        password,
      });
      setIsLoading(false);
      if (err) {
        logAuthError("signUp", err);
        setError(friendlyAuthError(err));
        return;
      }
      console.info("[auth] signUp ok", {
        user: data.user?.id,
        hasSession: !!data.session,
      });
      // With email confirmation disabled (project default for this app), signUp
      // returns a live session and we send the user straight in. The else
      // branch is a defensive fallback in case confirmation is later re-enabled.
      if (data.session) {
        router.refresh();
        router.push(next);
      } else {
        setSignupSent(true);
      }
    }
  }

  /**
   * Pretty-print the Supabase AuthError to the console with every diagnostic
   * field we care about. AuthError surface (from @supabase/auth-js):
   *   - name:    "AuthApiError" | "AuthRetryableFetchError" | ...
   *   - message: human-readable description
   *   - status:  HTTP status (e.g. 429)
   *   - code:    Supabase error code (e.g. "over_request_rate_limit",
   *              "over_email_send_rate_limit", "captcha_failed", ...)
   */
  function logAuthError(label: string, err: unknown) {
    const e = err as {
      name?: string;
      message?: string;
      status?: number;
      code?: string;
      __isAuthError?: boolean;
    };
    console.group(`%c[auth] ${label} failed`, "color: #c0392b; font-weight: 600;");
    console.error("name:    ", e?.name ?? "(unknown)");
    console.error("message: ", e?.message ?? "(none)");
    console.error("status:  ", e?.status ?? "(none)");
    console.error("code:    ", e?.code ?? "(none)");
    console.error("raw:     ", err);
    console.groupEnd();
  }

  /**
   * Map a Supabase error to user-facing copy. In development we suffix the
   * Supabase `code` so we can read it without opening DevTools.
   */
  function friendlyAuthError(err: {
    message?: string;
    code?: string;
    status?: number;
  }): string {
    const msg = err.message ?? "Something went wrong.";
    const code = err.code ?? "";
    const m = msg.toLowerCase();

    let copy = msg;
    if (code === "over_request_rate_limit" || m.includes("over_request_rate_limit")) {
      copy = "Hit Supabase's per-IP signup rate limit. Wait a few minutes and try again, or use the Supabase Dashboard to add a user.";
    } else if (
      code === "over_email_send_rate_limit" ||
      m.includes("email rate limit")
    ) {
      copy = "Email rate limit hit. Disable \"Confirm email\" in Supabase Dashboard \u2192 Authentication \u2192 Providers \u2192 Email.";
    } else if (code === "over_signup_rate_limit") {
      copy = "Hit the configured signup rate limit. Bump it in Supabase Dashboard \u2192 Authentication \u2192 Rate Limits.";
    } else if (code === "captcha_failed") {
      copy = "CAPTCHA is enabled in Supabase but the form isn't sending a token. Disable CAPTCHA in Authentication \u2192 Bot Protection.";
    } else if (m.includes("invalid login") || m.includes("invalid credentials")) {
      copy = "That email and password don't match.";
    } else if (m.includes("rate limit") || m.includes("too many requests")) {
      copy = "Too many attempts. Wait a minute and try again.";
    } else if (m.includes("user already registered")) {
      copy = "An account with that email already exists. Try signing in.";
    } else if (m.includes("email") && m.includes("not confirmed")) {
      copy = "This account hasn't been confirmed yet. Reset your password to get back in.";
    } else if (m.includes("weak password") || code === "weak_password") {
      copy = "That password is too common. Try something more unique.";
    }

    if (process.env.NODE_ENV !== "production" && code) {
      copy += `  [${code}${err.status ? ` ${err.status}` : ""}]`;
    }
    return copy;
  }

  if (signupSent) {
    return (
      <div className="flex flex-col items-center text-center py-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet/10 text-violet">
          <Check size={20} />
        </span>
        <h2 className="mt-3 text-[18px] text-ink">Confirm your email</h2>
        <p className="mt-1 text-[14px] text-slate">
          We sent a confirmation link to <strong>{email}</strong>. Click it to
          finish signing up.
        </p>
        <button
          type="button"
          onClick={() => {
            setSignupSent(false);
            setMode("signin");
          }}
          className="mt-4 text-[13px] text-violet hover:underline"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Auth mode"
        className="grid grid-cols-2 rounded-[6px] border border-stone bg-porcelain p-1"
      >
        <ModeTab
          active={mode === "signin"}
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          Icon={LogIn}
          label="Sign in"
        />
        <ModeTab
          active={mode === "signup"}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          Icon={UserPlus}
          label="Sign up"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            {mode === "signin" && (
              <Link
                href="/forgot-password"
                className="text-[12px] text-violet hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : 1}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            placeholder={
              mode === "signup" ? "At least 8 characters" : "Your password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "signup" && (
            <FieldHelp>Use at least 8 characters.</FieldHelp>
          )}
        </div>

        {error && <FieldError>{error}</FieldError>}

        <Button type="submit" size="md" disabled={isLoading}>
          {isLoading
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <p className="text-center text-[12px] text-ghost">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className="text-violet hover:underline"
            >
              Create an account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="text-violet hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof LogIn;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "bg-platinum text-violet shadow-[var(--shadow-soft)]"
          : "text-slate hover:text-ink",
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

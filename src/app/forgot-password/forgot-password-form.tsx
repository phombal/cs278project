"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        // After the user clicks the email link, Supabase exchanges the code via
        // /auth/callback which then redirects to /reset-password where they can
        // set a new password.
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );
    setIsLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center py-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet/10 text-violet">
          <Check size={20} />
        </span>
        <h2 className="mt-3 text-[18px] text-ink">Check your inbox</h2>
        <p className="mt-1 text-[14px] text-slate">
          If an account exists for <strong>{email}</strong>, we sent a link to
          reset your password. The link expires in one hour.
        </p>
      </div>
    );
  }

  return (
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
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" disabled={isLoading}>
        <Mail size={14} />
        {isLoading ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

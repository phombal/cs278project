"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError, FieldHelp } from "@/components/ui/input";

export function ResetPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.refresh();
      router.push("/");
    }, 1200);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center py-2">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-violet/10 text-violet">
          <Check size={20} />
        </span>
        <h2 className="mt-3 text-[18px] text-ink">Password updated</h2>
        <p className="mt-1 text-[14px] text-slate">
          Taking you home in a second…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {email && (
        <p className="text-[13px] text-slate">
          Resetting password for <strong className="text-ink">{email}</strong>
        </p>
      )}
      <div>
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FieldHelp>Use at least 8 characters.</FieldHelp>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

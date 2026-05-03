"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LogOut, User as UserIcon, Bookmark } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";

interface UserMenuProps {
  /** Public anonymous handle only — never real name or email */
  anonymousHandle: string;
  avatarUrl: string | null;
}

export function UserMenu({ anonymousHandle, avatarUrl }: UserMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleLogout() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      setConfirmOpen(false);
      router.refresh();
      router.push("/");
    });
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-[4px] px-1.5 py-1 hover:bg-porcelain"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={`Account menu (${anonymousHandle})`}
        >
          <Avatar src={avatarUrl} name={anonymousHandle} size={28} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 rounded-[6px] border border-stone bg-platinum shadow-[var(--shadow-lift)] overflow-hidden"
          >
            <div className="border-b border-stone px-3 py-2.5">
              <div className="text-[13px] font-medium text-ink truncate">
                {anonymousHandle}
              </div>
              <div className="text-[11px] text-ghost mt-0.5">
                Signed in
              </div>
            </div>
            <Link
              href="/u/me"
              className="flex items-center gap-2 px-3 py-2 text-[14px] text-ink hover:bg-porcelain"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              <UserIcon size={14} className="text-slate" />
              Profile
            </Link>
            <Link
              href="/saved"
              className="flex items-center gap-2 px-3 py-2 text-[14px] text-ink hover:bg-porcelain"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              <Bookmark size={14} className="text-slate" />
              Saved
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                setConfirmOpen(true);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[14px] text-ink hover:bg-porcelain"
              role="menuitem"
            >
              <LogOut size={14} className="text-slate" />
              Log out
            </button>
          </div>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!isPending) setConfirmOpen(false);
        }}
        title="Sign out?"
        description={`You're signed in as ${anonymousHandle}. You'll need to sign back in to post, comment, or save threads.`}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleLogout}
              disabled={isPending}
            >
              <LogOut size={14} />
              {isPending ? "Signing out…" : "Sign out"}
            </Button>
          </>
        }
      />
    </>
  );
}

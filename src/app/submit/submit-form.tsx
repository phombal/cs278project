"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import {
  Input,
  Textarea,
  Select,
  Label,
  FieldHelp,
  FieldError,
} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createPost } from "@/app/actions/posts";
import type { BoardKind, PostType } from "@/types/database";

interface BoardOption {
  slug: string;
  name: string;
  kind: BoardKind;
}
interface NeighborhoodOption {
  slug: string;
  name: string;
}

const types: { id: PostType; label: string; help: string }[] = [
  {
    id: "discussion",
    label: "Discussion",
    help: "Talk about anything — questions, advice, hot takes.",
  },
  {
    id: "review",
    label: "Review",
    help: "Rate a place you actually lived in.",
  },
  {
    id: "roommate",
    label: "Roommate",
    help: "Looking for or offering a room.",
  },
  {
    id: "question",
    label: "Question",
    help: "Quick question for the community.",
  },
];

export function SubmitForm({
  boards,
  neighborhoods,
  defaultBoard,
  defaultType,
}: {
  boards: BoardOption[];
  neighborhoods: NeighborhoodOption[];
  defaultBoard?: string;
  defaultType?: string;
}) {
  const [board, setBoard] = useState(defaultBoard ?? boards[0]?.slug ?? "");
  const [postType, setPostType] = useState<PostType>(
    (defaultType as PostType) ?? "discussion",
  );
  const [rating, setRating] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("post_type", postType);
    formData.set("board", board);
    if (postType === "review") formData.set("rating", String(rating));

    startTransition(async () => {
      try {
        await createPost(formData);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Could not submit";
        if (msg.includes("NEXT_REDIRECT")) return;
        setError(msg);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-6 rounded-[6px] border border-stone bg-platinum p-6"
    >
      {/* Board selector */}
      <div>
        <Label htmlFor="board">Post to</Label>
        <Select
          id="board"
          name="board"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
        >
          {boards.map((b) => (
            <option key={b.slug} value={b.slug}>
              b/{b.slug} — {b.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Post-type pills */}
      <div>
        <Label>Type of post</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {types.map((t) => {
            const isActive = t.id === postType;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setPostType(t.id)}
                className={cn(
                  "rounded-[4px] border px-3 py-2 text-left transition-colors",
                  isActive
                    ? "border-violet bg-violet/5"
                    : "border-stone hover:bg-porcelain",
                )}
              >
                <div
                  className={cn(
                    "text-[14px] font-medium",
                    isActive ? "text-violet" : "text-ink",
                  )}
                >
                  {t.label}
                </div>
                <div className="text-[11px] text-slate leading-snug mt-0.5">
                  {t.help}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={300}
          placeholder={
            postType === "review"
              ? "e.g. 1BR at Mosso, Mission Bay — great views, tiny kitchen"
              : "Be specific. What would scrolling users care about?"
          }
        />
      </div>

      {/* Body */}
      <div>
        <Label htmlFor="body">
          {postType === "review" ? "Tell us about it" : "Body"}
        </Label>
        <Textarea
          id="body"
          name="body"
          rows={6}
          maxLength={40000}
          placeholder={
            postType === "review"
              ? "Layout, light, neighbors, noise, management responsiveness, what you'd do differently…"
              : "Markdown is fine. Be helpful, be specific."
          }
        />
        <FieldHelp>
          Keep it useful. Personal info is your own to share — protect addresses
          unless the post is a public review.
        </FieldHelp>
      </div>

      {/* Review-only fields */}
      {postType === "review" && (
        <div className="rounded-[6px] border border-violet-washed bg-violet/5 p-5 flex flex-col gap-5">
          <div>
            <Label>Rating</Label>
            <div
              className="inline-flex items-center gap-1"
              role="radiogroup"
              aria-label="Rate from 1 to 5"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(n)}
                  aria-checked={rating === n}
                  role="radio"
                  className="p-1 rounded-[4px] hover:bg-violet/10"
                >
                  <Star
                    size={22}
                    className={
                      n <= rating
                        ? "text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
                        : "text-stone"
                    }
                  />
                </button>
              ))}
              <span className="ml-2 text-[12px] text-slate tabular">
                {rating ? `${rating}/5` : "Choose a rating"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rent_per_month">Monthly rent (USD)</Label>
              <Input
                id="rent_per_month"
                name="rent_per_month"
                type="number"
                min={0}
                step={1}
                placeholder="2400"
              />
            </div>
            <div>
              <Label htmlFor="neighborhood">Neighborhood</Label>
              <Select id="neighborhood" name="neighborhood" defaultValue="">
                <option value="">— pick one —</option>
                {neighborhoods.map((n) => (
                  <option key={n.slug} value={n.slug}>
                    {n.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="building_or_address">
              Building or street (optional)
            </Label>
            <Input
              id="building_or_address"
              name="building_or_address"
              maxLength={200}
              placeholder="e.g. NEMA, 8 Octavia, 24th & Mission"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lease_start">Lease start</Label>
              <Input id="lease_start" name="lease_start" type="date" />
            </div>
            <div>
              <Label htmlFor="lease_end">Lease end</Label>
              <Input id="lease_end" name="lease_end" type="date" />
            </div>
            <div>
              <Label htmlFor="would_recommend">Would recommend?</Label>
              <Select
                id="would_recommend"
                name="would_recommend"
                defaultValue=""
              >
                <option value="">—</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            </div>
          </div>
        </div>
      )}

      {error && <FieldError>{error}</FieldError>}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useCallback, useRef, useState, useTransition } from "react";
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
import {
  AddressAutocomplete,
  type PlaceSelection,
} from "@/components/places/address-autocomplete";
import { PhotoUpload } from "@/components/ui/photo-upload";

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

function StarRow({
  label,
  name,
  value,
  onPick,
}: {
  label: string;
  name: string;
  value: number;
  onPick: (n: number) => void;
}) {
  return (
    <div>
      <div className="text-[12px] font-medium text-ink mb-1">{label}</div>
      <div
        className="inline-flex items-center gap-0.5"
        role="radiogroup"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            onClick={() => onPick(n)}
            aria-checked={value === n}
            role="radio"
            className="p-1 rounded-[4px] hover:bg-violet/10"
          >
            <Star
              size={22}
              className={
                n <= value
                  ? "text-[color:var(--color-warning)] fill-[color:var(--color-warning)]"
                  : "text-stone"
              }
            />
          </button>
        ))}
        <span className="ml-2 text-[12px] text-slate tabular">
          {value ? `${value}/5` : "Required"}
        </span>
      </div>
      <input
        type="hidden"
        name={name}
        value={value > 0 ? String(value) : ""}
      />
    </div>
  );
}

export function SubmitForm({
  boards,
  neighborhoods,
  defaultBoard,
  defaultType,
  defaultPlaceId,
  defaultAddress,
}: {
  boards: BoardOption[];
  neighborhoods: NeighborhoodOption[];
  defaultBoard?: string;
  defaultType?: string;
  defaultPlaceId?: string;
  defaultAddress?: string;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const placeIdRef = useRef<HTMLInputElement>(null);
  const addrRef = useRef<HTMLInputElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);

  const [board, setBoard] = useState(defaultBoard ?? boards[0]?.slug ?? "");
  const [postType, setPostType] = useState<PostType>(
    (defaultType as PostType) ?? "discussion",
  );
  const [rl, setRl] = useState(0);
  const [rn, setRn] = useState(0);
  const [rs, setRs] = useState(0);
  const [rv, setRv] = useState(0);
  const [rc, setRc] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const overall =
    rl > 0 && rn > 0 && rs > 0 && rv > 0 && rc > 0
      ? ((rl + rn + rs + rv + rc) / 5).toFixed(1)
      : null;

  const onPlaceSelected = useCallback((p: PlaceSelection) => {
    if (placeIdRef.current) placeIdRef.current.value = p.placeId;
    if (addrRef.current) addrRef.current.value = p.formattedAddress;
    if (latRef.current)
      latRef.current.value =
        p.lat != null && Number.isFinite(p.lat) ? String(p.lat) : "";
    if (lngRef.current)
      lngRef.current.value =
        p.lng != null && Number.isFinite(p.lng) ? String(p.lng) : "";
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("post_type", postType);
    formData.set("board", board);

    // Append photo files to FormData
    console.log('[CLIENT] Appending photos to FormData:', photoFiles.length);
    photoFiles.forEach((file, idx) => {
      console.log(`[CLIENT] photo_${idx}:`, file.name, file.size, file.type);
      formData.append(`photo_${idx}`, file);
    });

    // Debug: Log all FormData keys
    console.log('[CLIENT] FormData keys:', Array.from(formData.keys()));

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

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          ref={titleRef}
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={300}
          defaultValue={
            defaultAddress && defaultAddress.length >= 5 ? defaultAddress : undefined
          }
          placeholder={
            postType === "review"
              ? "Filled from address — you can edit"
              : "Be specific. What would scrolling users care about?"
          }
        />
      </div>

      <div>
        <Label htmlFor="body">
          {postType === "review"
            ? "Your experience — be specific and helpful."
            : "Body"}
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
          {postType === "review"
            ? "Honest detail helps the next person decide."
            : "Keep it useful. Protect personal addresses unless this is a public review."}
        </FieldHelp>
      </div>

      {/* Photo upload */}
      <div>
        <Label>Photos (optional)</Label>
        <PhotoUpload onChange={setPhotoFiles} />
      </div>

      {postType === "review" && (
        <div className="rounded-[6px] border border-violet-washed bg-violet/5 p-5 flex flex-col gap-5">
          <input
            ref={placeIdRef}
            type="hidden"
            name="google_place_id"
            defaultValue={defaultPlaceId ?? ""}
          />
          <input
            ref={addrRef}
            type="hidden"
            name="address_formatted"
            defaultValue={defaultAddress ?? ""}
          />
          <input ref={latRef} type="hidden" name="latitude" defaultValue="" />
          <input ref={lngRef} type="hidden" name="longitude" defaultValue="" />

          <AddressAutocomplete
            onPlaceSelected={onPlaceSelected}
            titleInputRef={titleRef}
          />

          <div className="grid gap-4 sm:grid-cols-1">
            <StarRow
              label="Landlord / management responsiveness"
              name="rating_landlord"
              value={rl}
              onPick={setRl}
            />
            <StarRow
              label="Noise level (5 = very quiet)"
              name="rating_noise"
              value={rn}
              onPick={setRn}
            />
            <StarRow
              label="Safety of neighborhood"
              name="rating_safety"
              value={rs}
              onPick={setRs}
            />
            <StarRow
              label="Value for money"
              name="rating_value"
              value={rv}
              onPick={setRv}
            />
            <StarRow
              label="Commute / transit access"
              name="rating_commute"
              value={rc}
              onPick={setRc}
            />
          </div>

          {overall && (
            <p className="text-[14px] text-ink tabular">
              Overall: <span className="font-medium">{overall}</span> / 5.0
            </p>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[12px] font-medium text-ink mb-1">
              Lease length
            </legend>
            <label className="flex items-center gap-2 text-[14px] cursor-pointer">
              <input
                type="radio"
                name="lease_type"
                value="short_term"
                required
                className="accent-[color:var(--color-violet)]"
              />
              Short-term (1–6 months)
            </label>
            <label className="flex items-center gap-2 text-[14px] cursor-pointer">
              <input
                type="radio"
                name="lease_type"
                value="long_term"
                required
                className="accent-[color:var(--color-violet)]"
              />
              Long-term (6+ months)
            </label>
          </fieldset>

          <fieldset>
            <legend className="text-[12px] font-medium text-ink mb-2">
              Furnished?
            </legend>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                <input
                  type="radio"
                  name="furnished"
                  value="true"
                  required
                  className="accent-[color:var(--color-violet)]"
                />
                Yes
              </label>
              <label className="flex items-center gap-2 text-[14px] cursor-pointer">
                <input
                  type="radio"
                  name="furnished"
                  value="false"
                  required
                  className="accent-[color:var(--color-violet)]"
                />
                No
              </label>
            </div>
          </fieldset>

          <div>
            <Label htmlFor="affiliation">Your affiliation (optional)</Label>
            <Input
              id="affiliation"
              name="affiliation"
              maxLength={40}
              placeholder="e.g. Stanford '25, Google Intern, UC Berkeley"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rent_per_month">Monthly rent (USD, optional)</Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lease_start">Lease start (optional)</Label>
              <Input id="lease_start" name="lease_start" type="date" />
            </div>
            <div>
              <Label htmlFor="lease_end">Lease end (optional)</Label>
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

"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Input, Label, FieldHelp } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlaceSelection } from "@/components/places/place-selection";

export type { PlaceSelection } from "@/components/places/place-selection";

type Suggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

async function resolvePlaceSelection(
  placeId: string,
  composeFallback: string,
): Promise<PlaceSelection | null> {
  try {
    const res = await fetch(`/api/places/${encodeURIComponent(placeId)}`);
    if (res.ok) {
      const data = (await res.json()) as {
        publicLocationLabel?: string;
      };
      const publicLocationLabel = data.publicLocationLabel?.trim();
      if (publicLocationLabel) {
        return {
          placeId,
          composeLabel: composeFallback,
          publicLocationLabel,
        };
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function AddressAutocomplete({
  onPlaceSelected,
  titleInputRef,
  initialPlaceId,
  initialAddress,
}: {
  onPlaceSelected: (p: PlaceSelection) => void;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
  initialPlaceId?: string;
  initialAddress?: string;
}) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState(initialAddress ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selected, setSelected] = useState<PlaceSelection | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const applySelection = useCallback(
    (p: PlaceSelection) => {
      if (!p.placeId.trim() || !p.publicLocationLabel.trim()) {
        setApiError(
          "Could not link this address to a building. Try another suggestion.",
        );
        return;
      }
      setApiError(null);
      setSelected(p);
      setQuery(p.publicLocationLabel);
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      onPlaceSelected(p);
      if (titleInputRef?.current && !titleInputRef.current.value.trim()) {
        titleInputRef.current.value = p.publicLocationLabel;
      }
    },
    [onPlaceSelected, titleInputRef],
  );

  const clearSelection = useCallback(() => {
    setSelected(null);
    onPlaceSelected({
      placeId: "",
      composeLabel: "",
      publicLocationLabel: "",
    });
  }, [onPlaceSelected]);

  const prefilledRef = useRef(false);
  useEffect(() => {
    const pid = initialPlaceId?.trim();
    if (!pid || prefilledRef.current) return;
    prefilledRef.current = true;

    void (async () => {
      const resolved = await resolvePlaceSelection(
        pid,
        initialAddress?.trim() ?? "",
      );
      if (resolved) {
        applySelection(resolved);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (selected && trimmed === selected.publicLocationLabel) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setApiError(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setApiError(null);
        try {
          const res = await fetch("/api/places/autocomplete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input: trimmed }),
          });
          const data = (await res.json()) as {
            suggestions?: Suggestion[];
            error?: string;
          };
          if (!res.ok) {
            setApiError(
              data.error ?? "Address search unavailable. Check your API key.",
            );
            setSuggestions([]);
            setOpen(false);
            return;
          }
          const list = data.suggestions ?? [];
          setSuggestions(list);
          setOpen(list.length > 0);
          setActiveIndex(-1);
        } catch {
          setApiError("Could not reach address search.");
          setSuggestions([]);
          setOpen(false);
        } finally {
          setLoading(false);
        }
      })();
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function pickSuggestion(s: Suggestion) {
    setLoading(true);
    setApiError(null);
    const composeFallback = s.description || s.mainText;
    try {
      const resolved = await resolvePlaceSelection(s.placeId, composeFallback);
      if (resolved) {
        applySelection(resolved);
        return;
      }
      setApiError(
        "Could not create a safe public location label. Try another address.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(value: string) {
    setQuery(value);
    if (selected) clearSelection();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      void pickSuggestion(suggestions[activeIndex]!);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Label htmlFor="address_search">Address you lived at</Label>
      <div className="relative mt-1">
        <MapPin
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ghost"
          aria-hidden
        />
        <Input
          id="address_search"
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          placeholder="Start typing a street address…"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pl-9"
        />
        {loading && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-ghost">
            Searching…
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-[240px] w-full overflow-auto rounded-[6px] border border-stone bg-platinum py-1 shadow-[var(--shadow-lg)]"
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId} role="presentation">
              <button
                type="button"
                id={`${listId}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => void pickSuggestion(s)}
                className={cn(
                  "w-full px-3 py-2.5 text-left transition-colors",
                  i === activeIndex ? "bg-porcelain" : "hover:bg-porcelain",
                )}
              >
                <span className="block text-[14px] text-ink leading-snug">
                  {s.mainText}
                </span>
                {s.secondaryText && (
                  <span className="block text-[12px] text-slate mt-0.5">
                    {s.secondaryText}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <p className="mt-2 flex items-start gap-2 text-[12px] text-slate">
          <span className="text-success shrink-0" aria-hidden>
            ✓
          </span>
          <span className="min-w-0 flex-1">
            Publicly shown as{" "}
            <span className="text-ink">{selected.publicLocationLabel}</span>
            <span className="block mt-0.5 text-ghost">
              Your street number is never posted.
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              clearSelection();
              setQuery("");
            }}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-ghost hover:bg-porcelain hover:text-ink"
            aria-label="Clear selected address"
          >
            <X size={14} />
          </button>
        </p>
      )}

      <FieldHelp>
        Search with your full address, then pick a match. Only street and city
        are shown publicly—not your street number.
      </FieldHelp>

      {apiError && (
        <p className="mt-1 text-[12px] text-[color:var(--color-danger)]">
          {apiError}
        </p>
      )}
    </div>
  );
}

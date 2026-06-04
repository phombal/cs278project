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
      if (!p.placeId.trim()) {
        setApiError(
          "Could not link this address to a building. Try another suggestion.",
        );
        return;
      }
      setApiError(null);
      setSelected(p);
      setQuery(p.formattedAddress);
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      onPlaceSelected(p);
      if (titleInputRef?.current && !titleInputRef.current.value.trim()) {
        titleInputRef.current.value = p.formattedAddress;
      }
    },
    [onPlaceSelected, titleInputRef],
  );

  const clearSelection = useCallback(() => {
    setSelected(null);
    onPlaceSelected({
      placeId: "",
      formattedAddress: "",
      lat: null,
      lng: null,
    });
  }, [onPlaceSelected]);

  // Prefill once when arriving from a building page (?placeId=…&address=…)
  const prefilledRef = useRef(false);
  useEffect(() => {
    const pid = initialPlaceId?.trim();
    if (!pid || prefilledRef.current) return;
    prefilledRef.current = true;

    const formatted = initialAddress?.trim() ?? "";
    if (formatted) {
      applySelection({
        placeId: pid,
        formattedAddress: formatted,
        lat: null,
        lng: null,
      });
      return;
    }

    void (async () => {
      try {
        const res = await fetch(`/api/places/${encodeURIComponent(pid)}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          formattedAddress?: string;
          latitude?: number | null;
          longitude?: number | null;
        };
        const addr = data.formattedAddress?.trim();
        if (!addr) return;
        applySelection({
          placeId: pid,
          formattedAddress: addr,
          lat: data.latitude ?? null,
          lng: data.longitude ?? null,
        });
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (selected && trimmed === selected.formattedAddress) {
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

  // Close list on outside click
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
    try {
      const res = await fetch(`/api/places/${encodeURIComponent(s.placeId)}`);
      if (res.ok) {
        const data = (await res.json()) as {
          formattedAddress?: string;
          latitude?: number | null;
          longitude?: number | null;
        };
        const formattedAddress =
          data.formattedAddress?.trim() || s.description || s.mainText;
        applySelection({
          placeId: s.placeId,
          formattedAddress,
          lat: data.latitude ?? null,
          lng: data.longitude ?? null,
        });
        return;
      }
      applySelection({
        placeId: s.placeId,
        formattedAddress: s.description || s.mainText,
        lat: null,
        lng: null,
      });
    } catch {
      applySelection({
        placeId: s.placeId,
        formattedAddress: s.description || s.mainText,
        lat: null,
        lng: null,
      });
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
            Selected:{" "}
            <span className="text-ink">{selected.formattedAddress}</span>
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
        Pick an address from the list so your review links to the right building.
      </FieldHelp>

      {apiError && (
        <p className="mt-1 text-[12px] text-[color:var(--color-danger)]">
          {apiError}
        </p>
      )}
    </div>
  );
}

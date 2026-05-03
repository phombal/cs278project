"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/input";
import {
  ensureMapsBootstrap,
  normalizePlaceIdForStorage,
} from "@/lib/maps/google-maps-loader";

export interface PlaceSelection {
  placeId: string;
  formattedAddress: string;
  lat: number | null;
  lng: number | null;
}

export function AddressAutocomplete({
  onPlaceSelected,
  titleInputRef,
}: {
  onPlaceSelected: (p: PlaceSelection) => void;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pacRef = useRef<HTMLElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    if (!key) {
      setLoadError("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to use address search.");
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        await ensureMapsBootstrap(key);
        if (cancelled || !containerRef.current || !window.google?.maps?.importLibrary)
          return;

        const { PlaceAutocompleteElement } = (await google.maps.importLibrary(
          "places",
        )) as unknown as {
          PlaceAutocompleteElement: new (opts?: {
            includedRegionCodes?: string[];
            placeholder?: string;
            requestedRegion?: string;
          }) => HTMLElement & {
            addEventListener: (
              type: "gmp-select",
              listener: (ev: Event) => void,
            ) => void;
            style: CSSStyleDeclaration;
          };
        };

        const el = new PlaceAutocompleteElement({
          includedRegionCodes: ["us"],
          placeholder: "Start typing a street address…",
          requestedRegion: "us",
        });

        el.style.width = "100%";

        function onSelect(ev: Event) {
          void (async () => {
            const e = ev as google.maps.places.PlacePredictionSelectEvent;
            const place = e.placePrediction.toPlace();
            await place.fetchFields({
              fields: ["id", "formattedAddress", "location"],
            });
            const rawId = place.id ?? "";
            const placeId = normalizePlaceIdForStorage(rawId);
            const formattedAddress = place.formattedAddress ?? "";
            const lat = place.location?.lat() ?? null;
            const lng = place.location?.lng() ?? null;
            if (!placeId || !formattedAddress) return;
            onPlaceSelected({
              placeId,
              formattedAddress,
              lat,
              lng,
            });
            if (titleInputRef?.current && !titleInputRef.current.value.trim()) {
              titleInputRef.current.value = formattedAddress;
            }
          })();
        }

        el.addEventListener("gmp-select", onSelect);
        containerRef.current.appendChild(el);
        pacRef.current = el;
      } catch {
        if (!cancelled) setLoadError("Could not load address autocomplete.");
      }
    })();

    return () => {
      cancelled = true;
      if (pacRef.current) {
        pacRef.current.remove();
        pacRef.current = null;
      }
    };
  }, [key, onPlaceSelected, titleInputRef]);

  return (
    <div>
      <Label htmlFor="address_autocomplete_host">Address you lived at</Label>
      <div
        id="address_autocomplete_host"
        ref={containerRef}
        className="mt-1 min-h-10 w-full rounded-[4px] border border-stone bg-platinum px-0 overflow-hidden [&_gmp-place-autocomplete]:w-full"
      />
      {loadError && (
        <p className="mt-1 text-[12px] text-[color:var(--color-danger)]">
          {loadError}
        </p>
      )}
    </div>
  );
}

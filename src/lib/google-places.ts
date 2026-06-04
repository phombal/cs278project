export type PlaceAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

export type PlaceDetailsResult = {
  displayName: string;
  formattedAddress: string;
  addressComponents: PlaceAddressComponent[];
  latitude: number | null;
  longitude: number | null;
};

export type PlaceSuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

/** Normalize Places API resource id (e.g. `places/ChIJ…` → `ChIJ…`). */
export function normalizePlaceId(raw: string): string {
  return raw.startsWith("places/") ? raw.slice("places/".length) : raw;
}

function getMapsApiKey(): string | null {
  return (
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    null
  );
}

export async function fetchPlaceSuggestions(
  input: string,
): Promise<PlaceSuggestion[]> {
  const key = getMapsApiKey();
  const trimmed = input.trim();
  if (!key || trimmed.length < 2) return [];

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
    },
    body: JSON.stringify({
      input: trimmed,
      includedRegionCodes: ["us"],
      locationBias: {
        circle: {
          center: { latitude: 37.7749, longitude: -122.4194 },
          radius: 50000,
        },
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    suggestions?: Array<{
      placePrediction?: {
        /** Short id, when present */
        placeId?: string;
        /** Resource name, e.g. `places/ChIJ…` — primary in Places API (New) */
        place?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };

  const out: PlaceSuggestion[] = [];
  for (const s of data.suggestions ?? []) {
    const pred = s.placePrediction;
    const rawId = pred?.placeId ?? pred?.place ?? "";
    const placeId = normalizePlaceId(rawId);
    if (!placeId) continue;
    const mainText = pred?.structuredFormat?.mainText?.text ?? "";
    const secondaryText = pred?.structuredFormat?.secondaryText?.text ?? "";
    const description = pred?.text?.text ?? [mainText, secondaryText].filter(Boolean).join(", ");
    out.push({
      placeId,
      description,
      mainText: mainText || description,
      secondaryText,
    });
  }
  return out;
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetailsResult | null> {
  const key = getMapsApiKey();
  if (!key) return null;

  const id = normalizePlaceId(placeId);
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "displayName,formattedAddress,addressComponents,location",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    displayName?: { text?: string };
    formattedAddress?: string;
    addressComponents?: PlaceAddressComponent[];
    location?: { latitude?: number; longitude?: number };
  };

  return {
    displayName: data.displayName?.text ?? "",
    formattedAddress: data.formattedAddress ?? "",
    addressComponents: data.addressComponents ?? [],
    latitude: data.location?.latitude ?? null,
    longitude: data.location?.longitude ?? null,
  };
}

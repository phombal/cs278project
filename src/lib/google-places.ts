export type PlaceDetailsResult = {
  displayName: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
};

export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetailsResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "displayName,formattedAddress,location",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  };

  return {
    displayName: data.displayName?.text ?? "",
    formattedAddress: data.formattedAddress ?? "",
    latitude: data.location?.latitude ?? null,
    longitude: data.location?.longitude ?? null,
  };
}

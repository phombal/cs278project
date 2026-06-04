import type { PlaceDetailsResult } from "@/lib/google-places";

export type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

/** Strip leading street number / unit from a single address line. */
export function stripStreetNumber(line: string): string {
  return line
    .replace(/^\s*\d+[\w/-]*\s+/, "")
    .replace(/\s+(#|apt|unit|ste|suite)\s*[\w-]+\s*$/i, "")
    .trim();
}

function componentText(
  components: AddressComponent[],
  type: string,
): string | null {
  const c = components.find((x) => x.types?.includes(type));
  return (c?.longText ?? c?.shortText ?? "").trim() || null;
}

/**
 * Public label: street name + city only (no street number, unit, or coordinates).
 */
export function toPublicLocationLabel(
  components: AddressComponent[],
  formattedAddress?: string,
  displayName?: string,
): string | null {
  const route = componentText(components, "route");
  const locality =
    componentText(components, "locality") ??
    componentText(components, "postal_town") ??
    componentText(components, "sublocality") ??
    componentText(components, "sublocality_level_1");
  const admin2 = componentText(components, "administrative_area_level_2");
  const city = locality ?? admin2;

  if (route && city) {
    return `${route}, ${city}`;
  }
  if (route) {
    return route;
  }

  if (formattedAddress?.trim()) {
    const parts = formattedAddress.split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      const street = stripStreetNumber(parts[0] ?? "");
      const cityPart = parts[1] ?? parts[parts.length - 1];
      if (street && cityPart) return `${street}, ${cityPart}`;
    }
    const stripped = stripStreetNumber(formattedAddress);
    if (stripped.length >= 3) return stripped;
  }

  const name = displayName?.trim();
  if (name && name.length >= 3 && !/^\d+/.test(name)) {
    return name;
  }

  return null;
}

export function publicLabelFromPlaceDetails(
  details: PlaceDetailsResult,
): string | null {
  return toPublicLocationLabel(
    details.addressComponents ?? [],
    details.formattedAddress,
    details.displayName,
  );
}

/** Best-effort anonymize legacy full addresses already in the DB. */
export function anonymizeLegacyAddress(full: string): string | null {
  const trimmed = full.trim();
  if (!trimmed) return null;
  return toPublicLocationLabel([], trimmed);
}

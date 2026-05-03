/**
 * Loads Maps JS with `loading=async` so `google.maps.importLibrary` works,
 * then imports the Places library (PlaceAutocompleteElement).
 */

let mapsBootstrapPromise: Promise<void> | null = null;

function hasImportLibrary(): boolean {
  const il = (
    window as unknown as {
      google?: { maps?: { importLibrary?: unknown } };
    }
  ).google?.maps?.importLibrary;
  return typeof il === "function";
}

export function ensureMapsBootstrap(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (hasImportLibrary()) {
    return Promise.resolve();
  }

  if (mapsBootstrapPromise) return mapsBootstrapPromise;

  mapsBootstrapPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-google-maps-bootstrap="1"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps script failed")),
      );
      if (hasImportLibrary()) resolve();
      return;
    }

    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=places`;
    s.async = true;
    s.defer = true;
    s.setAttribute("data-google-maps-bootstrap", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(s);
  });

  return mapsBootstrapPromise;
}

/** Normalize Places API resource id (e.g. `places/ChIJ…` → `ChIJ…`). */
export function normalizePlaceIdForStorage(raw: string): string {
  return raw.startsWith("places/") ? raw.slice("places/".length) : raw;
}

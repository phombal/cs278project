import { NextResponse } from "next/server";
import { fetchPlaceDetails, normalizePlaceId } from "@/lib/google-places";
import { publicLabelFromPlaceDetails } from "@/lib/location-anonymize";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId: raw } = await context.params;
  const placeId = normalizePlaceId(decodeURIComponent(raw));
  if (
    !process.env.GOOGLE_MAPS_API_KEY &&
    !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  ) {
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 503 },
    );
  }
  const details = await fetchPlaceDetails(placeId);
  if (!details) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }
  const publicLocationLabel = publicLabelFromPlaceDetails(details);
  if (!publicLocationLabel) {
    return NextResponse.json(
      { error: "Could not derive public location label" },
      { status: 422 },
    );
  }
  return NextResponse.json({
    publicLocationLabel,
    displayName: details.displayName,
  });
}

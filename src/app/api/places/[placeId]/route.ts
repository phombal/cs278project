import { NextResponse } from "next/server";
import { fetchPlaceDetails, normalizePlaceId } from "@/lib/google-places";

export async function GET(
  _request: Request,
  context: { params: Promise<{ placeId: string }> },
) {
  const { placeId: raw } = await context.params;
  const placeId = normalizePlaceId(decodeURIComponent(raw));
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "Places API not configured" },
      { status: 503 },
    );
  }
  const details = await fetchPlaceDetails(placeId);
  if (!details) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }
  return NextResponse.json({
    displayName: details.displayName,
    formattedAddress: details.formattedAddress,
    latitude: details.latitude,
    longitude: details.longitude,
  });
}

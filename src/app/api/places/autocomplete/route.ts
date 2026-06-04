import { NextResponse } from "next/server";
import { fetchPlaceSuggestions } from "@/lib/google-places";

export async function POST(request: Request) {
  if (!process.env.GOOGLE_MAPS_API_KEY && !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "Places API not configured", suggestions: [] },
      { status: 503 },
    );
  }

  let input = "";
  try {
    const body = (await request.json()) as { input?: string };
    input = String(body.input ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const suggestions = await fetchPlaceSuggestions(input);
  return NextResponse.json({ suggestions });
}

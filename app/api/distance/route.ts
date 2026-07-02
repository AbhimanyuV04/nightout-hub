import { NextResponse } from "next/server";

type Body = { origin?: { lat: number; lng: number }; destinations?: string[] };

export type DistanceResult = {
  destination: string;
  distanceText: string | null;
  durationText: string | null;
  durationValue: number | null; // seconds — handy for client-side sorting
};

// Google Maps Distance Matrix, called server-side so GOOGLE_MAPS_API_KEY never reaches the
// client. Destinations are venue place-name strings (Distance Matrix geocodes them).
export async function POST(request: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  // Graceful fallback: no key -> empty results, client simply shows no badges.
  if (!key) return NextResponse.json({ results: [], reason: "unconfigured" });

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { origin, destinations } = body;
  if (
    !origin ||
    typeof origin.lat !== "number" ||
    typeof origin.lng !== "number" ||
    !Array.isArray(destinations) ||
    destinations.length === 0
  ) {
    return NextResponse.json({ error: "origin and destinations required" }, { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destinations", destinations.join("|"));
  url.searchParams.set("mode", "driving");
  url.searchParams.set("key", key);

  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

  const data = await upstream.json();
  const elements: Array<{
    status: string;
    distance?: { text: string };
    duration?: { text: string; value: number };
  }> = data.rows?.[0]?.elements ?? [];

  const results: DistanceResult[] = destinations.map((destination, i) => {
    const el = elements[i];
    const ok = el?.status === "OK";
    return {
      destination,
      distanceText: ok ? el.distance?.text ?? null : null,
      durationText: ok ? el.duration?.text ?? null : null,
      durationValue: ok ? el.duration?.value ?? null : null,
    };
  });

  return NextResponse.json({ results });
}

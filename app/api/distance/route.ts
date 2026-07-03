import { NextResponse } from "next/server";

type LatLng = { lat: number; lng: number };
type Body = { origin?: LatLng; destinations?: LatLng[] };

export type DistanceResult = {
  durationText: string | null;
  distanceText: string | null;
  durationValue: number | null; // seconds — handy for client-side sorting
};

function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min${m === 1 ? "" : "s"}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} hr ${rem} min` : `${h} hr`;
}

function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

// Driving time/distance via the public OSRM server (OpenStreetMap) — no API key, no billing.
// Both origin and destinations are coordinates (the place picker supplies them).
export async function POST(request: Request) {
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

  // OSRM expects lon,lat. Point 0 is the origin (sources=0); the rest are destinations.
  const points = [origin, ...destinations].map((p) => `${p.lng},${p.lat}`).join(";");
  const url = `https://router.project-osrm.org/table/v1/driving/${points}?sources=0&annotations=duration,distance`;

  let data: { code?: string; durations?: number[][]; distances?: number[][] };
  try {
    const upstream = await fetch(url, { cache: "no-store" });
    if (!upstream.ok) return NextResponse.json({ error: "Routing upstream error" }, { status: 502 });
    data = await upstream.json();
  } catch {
    return NextResponse.json({ error: "Routing unreachable" }, { status: 502 });
  }

  if (data.code !== "Ok" || !data.durations?.[0]) {
    return NextResponse.json({ results: [] });
  }

  const durs = data.durations[0]; // origin -> [origin, dest1, dest2, …]
  const dists = data.distances?.[0];
  const results: DistanceResult[] = destinations.map((_, i) => {
    const sec = durs[i + 1]; // +1 skips origin -> origin
    const met = dists?.[i + 1];
    return {
      durationText: typeof sec === "number" ? fmtDuration(sec) : null,
      distanceText: typeof met === "number" ? fmtDistance(met) : null,
      durationValue: typeof sec === "number" ? Math.round(sec) : null,
    };
  });

  return NextResponse.json({ results });
}

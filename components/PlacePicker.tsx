"use client";

import { useEffect, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };
type Prediction = { name: string; label: string; picked: string; lat: number; lng: number };
type PhotonFeature = {
  properties?: {
    name?: string;
    street?: string;
    district?: string;
    suburb?: string;
    neighbourhood?: string;
    locality?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

// Only surface results within this radius of the user, so someone in India doesn't see a
// "Bob's Bar" in Ohio. Generous enough to cover a metro + nearby towns.
const NEARBY_KM = 120;

function distKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Place autocomplete via Photon (OpenStreetMap, keyless), biased to the searcher's location.
// Picking a result supplies coords used for distance/time; free-text add still works.
export default function PlacePicker({
  onSubmit,
  pending,
}: {
  onSubmit: (name: string, coords: { lat: number; lng: number } | null) => void;
  pending: boolean;
}) {
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const askedLoc = useRef(false);

  // Ask for location the moment they start picking a place, so results can be local.
  function requestLocation() {
    if (askedLoc.current || !("geolocation" in navigator)) return;
    askedLoc.current = true;
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => setUserLoc({ lat: c.latitude, lng: c.longitude }),
      () => {}, // denied — fall back to unbiased search
      { maximumAge: 300000, timeout: 10000 }
    );
  }

  useEffect(() => {
    if (coords || query.trim().length < 3) {
      setPreds([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        let url = `https://photon.komoot.io/api?limit=8&q=${encodeURIComponent(query)}`;
        if (userLoc) url += `&lat=${userLoc.lat}&lon=${userLoc.lng}&zoom=12&location_bias_scale=0.6`;
        const res = await fetch(url);
        const data: { features?: PhotonFeature[] } = await res.json();
        let list: Prediction[] = (data.features ?? [])
          .map((f) => {
            const p = f.properties ?? {};
            const c = f.geometry?.coordinates;
            // The neighbourhood/area (Indiranagar, Koramangala…) is what disambiguates —
            // show that + city, and drop the obvious state/country.
            const area = p.district || p.suburb || p.neighbourhood || p.locality || p.street || "";
            const label =
              [area, p.city].filter(Boolean).join(", ") ||
              [p.state, p.country].filter(Boolean).join(", ");
            const name = p.name || area || p.city || label;
            const picked = [p.name, area].filter(Boolean).join(", ") || name;
            return { name, label, picked, lat: c?.[1] ?? NaN, lng: c?.[0] ?? NaN };
          })
          .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng) && x.label);
        // Drop far-away matches when we know where the user is.
        if (userLoc) list = list.filter((p) => distKm(userLoc, p) <= NEARBY_KM);
        setPreds(list.slice(0, 5));
        setOpen(true);
      } catch {
        // Photon unreachable — allow free-text add without suggestions.
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, coords, userLoc]);

  function pick(p: Prediction) {
    setQuery(p.picked);
    setCoords({ lat: p.lat, lng: p.lng });
    setPreds([]);
    setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = query.trim();
    if (!name) return;
    onSubmit(name, coords);
    setQuery("");
    setCoords(null);
    setPreds([]);
    setOpen(false);
  }

  return (
    <form onSubmit={submit} className="relative">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCoords(null); // typing invalidates a previous pick
          }}
          onFocus={() => {
            requestLocation();
            if (preds.length) setOpen(true);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search a place…"
          autoComplete="off"
          className="field flex-1"
        />
        <button type="submit" disabled={pending} className="btn-primary w-auto px-5">
          Add
        </button>
      </div>
      {open && preds.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#1C1C1E] shadow-xl backdrop-blur-xl">
          {preds.map((p, i) => (
            <li key={`${p.label}-${i}`}>
              <button
                type="button"
                onClick={() => pick(p)}
                className="block w-full px-3 py-2 text-left transition hover:bg-white/5"
              >
                <span className="block truncate text-sm">{p.name}</span>
                <span className="muted block truncate text-xs">{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

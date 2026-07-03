"use client";

import { useEffect, useRef, useState } from "react";

type Prediction = { name: string; label: string; lat: number; lng: number };
type PhotonFeature = {
  properties?: { name?: string; city?: string; state?: string; country?: string };
  geometry?: { coordinates?: [number, number] };
};

// Place autocomplete via Photon (OpenStreetMap, keyless). Picking a result supplies coords
// used for distance/time; typing free text and hitting Add still works (no coords).
export default function PlacePicker({
  onSubmit,
  pending,
}: {
  onSubmit: (name: string, coords: { lat: number; lng: number } | null) => void;
  pending: boolean;
}) {
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Don't re-search once a place is picked, or for very short queries.
    if (coords || query.trim().length < 3) {
      setPreds([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api?limit=5&q=${encodeURIComponent(query)}`);
        const data: { features?: PhotonFeature[] } = await res.json();
        const list: Prediction[] = (data.features ?? [])
          .map((f) => {
            const p = f.properties ?? {};
            const c = f.geometry?.coordinates;
            const label = [p.name, p.city, p.state, p.country].filter(Boolean).join(", ");
            return { name: p.name ?? label, label, lat: c?.[1] ?? NaN, lng: c?.[0] ?? NaN };
          })
          .filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng) && x.label);
        setPreds(list);
        setOpen(true);
      } catch {
        // Photon unreachable — allow free-text add without suggestions.
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, coords]);

  function pick(p: Prediction) {
    setQuery(p.label);
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
          onFocus={() => preds.length && setOpen(true)}
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

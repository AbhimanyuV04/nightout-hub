"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { addItinerarySuggestion, voteItinerary } from "@/app/actions";
import type { DistanceResult } from "@/app/api/distance/route";

type Suggestion = { id: string; place_name: string; upvotes_count: number };

export default function ItineraryPoll({
  roomCode,
  suggestions,
}: {
  roomCode: string;
  suggestions: Suggestion[];
}) {
  const [place, setPlace] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // place_name -> "42 mins". Empty until the user's location resolves and /api/distance answers.
  const [durations, setDurations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!suggestions.length || !("geolocation" in navigator)) return;
    let cancelled = false;
    const names = suggestions.map((s) => s.place_name);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch("/api/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: { lat: coords.latitude, lng: coords.longitude },
              destinations: names,
            }),
          });
          if (!res.ok) return;
          const data: { results?: DistanceResult[] } = await res.json();
          if (cancelled || !data.results) return;
          const map: Record<string, string> = {};
          for (const r of data.results) if (r.durationText) map[r.destination] = r.durationText;
          setDurations(map);
        } catch {
          // network / API failure — leave badges empty
        }
      },
      () => {
        // location sharing off or denied — no badges, no error
      },
      { maximumAge: 60000, timeout: 10000 }
    );

    return () => {
      cancelled = true;
    };
  }, [suggestions]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = place;
    startTransition(async () => {
      const res = await addItinerarySuggestion(roomCode, value);
      if (res?.error) setError(res.error);
      else {
        setError("");
        setPlace("");
      }
    });
  }

  function vote(id: string, increment: boolean) {
    startTransition(async () => {
      const res = await voteItinerary(id, increment);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <section className="card space-y-3">
      <h2 className="section-title">Where to?</h2>
      <ul className="space-y-2">
        {!suggestions.length && <li className="muted text-sm">No suggestions yet</li>}
        <AnimatePresence initial={false}>
          {suggestions.map((s) => (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="flex items-center justify-between gap-2 overflow-hidden rounded-xl bg-[#111111] px-3 py-2"
            >
              <span>{s.place_name}</span>
              <div className="flex items-center gap-2">
                {durations[s.place_name] && (
                  <span className="muted whitespace-nowrap text-xs">
                    • {durations[s.place_name]} away
                  </span>
                )}
                <span className="min-w-6 text-center font-semibold text-[#FF375F]">
                  {s.upvotes_count}
                </span>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  disabled={pending}
                  onClick={() => vote(s.id, true)}
                  className="btn-ghost px-2.5 py-1"
                >
                  ▲
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  disabled={pending}
                  onClick={() => vote(s.id, false)}
                  className="btn-ghost px-2.5 py-1"
                >
                  ▼
                </motion.button>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Suggest a place"
          className="field flex-1"
        />
        <button type="submit" disabled={pending} className="btn-primary w-auto px-5">
          Add
        </button>
      </form>
      {error && <p className="text-sm text-[#FF375F]">{error}</p>}
    </section>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { addItinerarySuggestion, deleteSuggestion, voteItinerary } from "@/app/actions";
import type { DistanceResult } from "@/app/api/distance/route";
import PlacePicker from "./PlacePicker";

type Suggestion = {
  id: string;
  place_name: string;
  upvotes_count: number;
  lat: number | null;
  lng: number | null;
  created_by_user_id: string;
};
type PlaceInfo = { duration: string | null; distance: string | null };

export default function ItineraryPoll({
  roomCode,
  suggestions,
  me,
}: {
  roomCode: string;
  suggestions: Suggestion[];
  me: { id: string; is_host: boolean } | null;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  // suggestion.id -> { duration, distance }. Empty until location resolves and OSRM answers.
  const [info, setInfo] = useState<Record<string, PlaceInfo>>({});

  useEffect(() => {
    const located = suggestions.filter((s) => s.lat != null && s.lng != null);
    if (!located.length || !("geolocation" in navigator)) return;
    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch("/api/distance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              origin: { lat: coords.latitude, lng: coords.longitude },
              destinations: located.map((s) => ({ lat: s.lat, lng: s.lng })),
            }),
          });
          if (!res.ok) return;
          const data: { results?: DistanceResult[] } = await res.json();
          if (cancelled || !data.results) return;
          const map: Record<string, PlaceInfo> = {};
          data.results.forEach((r, i) => {
            const s = located[i];
            if (s && (r.durationText || r.distanceText)) {
              map[s.id] = { duration: r.durationText, distance: r.distanceText };
            }
          });
          setInfo(map);
        } catch {
          // network / API failure — leave the sublines empty
        }
      },
      () => {
        // location sharing off or denied — no distances, no error
      },
      { maximumAge: 60000, timeout: 10000 }
    );

    return () => {
      cancelled = true;
    };
  }, [suggestions]);

  // Live poll feel: each row gets a vote-share bar; the leader wears the crown.
  const maxVotes = Math.max(1, ...suggestions.map((s) => s.upvotes_count));
  const hasLeader = suggestions.some((s) => s.upvotes_count > 0);

  function canDelete(s: Suggestion) {
    return !!me && (me.is_host || s.created_by_user_id === me.id);
  }

  function addSuggestion(name: string, coords: { lat: number; lng: number } | null) {
    startTransition(async () => {
      const res = await addItinerarySuggestion(roomCode, name, coords ?? undefined);
      setError(res?.error ?? "");
    });
  }

  function vote(id: string, increment: boolean) {
    startTransition(async () => {
      const res = await voteItinerary(id, increment);
      if (res?.error) setError(res.error);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteSuggestion(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <section className="card space-y-3">
      <h2 className="section-title">Where to?</h2>
      <ul className="space-y-2">
        {!suggestions.length && <li className="muted text-sm">No suggestions yet</li>}
        <AnimatePresence initial={false}>
          {suggestions.map((s) => {
            const pi = info[s.id];
            return (
              <motion.li
                key={s.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative overflow-hidden rounded-xl bg-[#111111] py-2 pl-3 pr-6"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block truncate">
                      {hasLeader && s.upvotes_count === maxVotes && <span aria-hidden>👑 </span>}
                      {s.place_name}
                    </span>
                    {pi?.duration && (
                      <span className="muted text-xs">
                        {pi.duration} away
                        {pi.distance ? ` • ${pi.distance}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
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
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    animate={{ width: `${(s.upvotes_count / maxVotes) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    className="h-full rounded-full bg-gradient-to-r from-[#FF375F] to-[#FF8FA3]"
                  />
                </div>
                {canDelete(s) && (
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    disabled={pending}
                    aria-label="Delete suggestion"
                    className="absolute right-1.5 top-1.5 text-xs leading-none text-[#8E8E93] transition hover:text-[#FF375F] active:scale-90"
                  >
                    ✕
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <PlacePicker onSubmit={addSuggestion} pending={pending} />
      {error && <p className="text-sm text-[#FF375F]">{error}</p>}
    </section>
  );
}

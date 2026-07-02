"use client";

import { useState, useTransition } from "react";
import { addItinerarySuggestion, voteItinerary } from "@/app/actions";

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
      <h2 className="font-semibold">Where to?</h2>
      <ul className="space-y-2">
        {!suggestions.length && <li className="muted text-sm">No suggestions yet</li>}
        {suggestions.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-2 rounded-xl bg-[#111111] px-3 py-2"
          >
            <span>{s.place_name}</span>
            <div className="flex items-center gap-2">
              <span className="min-w-6 text-center font-semibold text-[#FF375F]">
                {s.upvotes_count}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => vote(s.id, true)}
                className="btn-ghost px-2.5 py-1"
              >
                ▲
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => vote(s.id, false)}
                className="btn-ghost px-2.5 py-1"
              >
                ▼
              </button>
            </div>
          </li>
        ))}
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

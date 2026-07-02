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
    <section className="border p-4 space-y-2">
      <h2 className="font-semibold">Where to?</h2>
      <ul className="space-y-1">
        {!suggestions.length && <li className="text-sm">No suggestions yet</li>}
        {suggestions.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => vote(s.id, true)}
              className="border px-2"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => vote(s.id, false)}
              className="border px-2"
            >
              ▼
            </button>
            <span>
              {s.place_name} ({s.upvotes_count})
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Suggest a place"
          className="border p-2 flex-1"
        />
        <button type="submit" disabled={pending} className="border p-2">
          Add
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </section>
  );
}

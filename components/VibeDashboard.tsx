"use client";

import { useEffect, useState, useTransition } from "react";
import { updateVibeCheck } from "@/app/actions";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "It's happening now!";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m ${s % 60}s`;
}

export default function VibeDashboard({
  roomCode,
  dressCode,
  eventDate,
  isHost,
}: {
  roomCode: string;
  dressCode: string | null;
  eventDate: string | null;
  isHost: boolean;
}) {
  const [remaining, setRemaining] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!eventDate) {
      setRemaining(null);
      return;
    }
    const target = new Date(eventDate).getTime();
    const tick = () => setRemaining(formatRemaining(target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [eventDate]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const dc = String(form.get("dressCode") ?? "");
    const date = String(form.get("date") ?? "");
    startTransition(async () => {
      const res = await updateVibeCheck(roomCode, dc, date);
      setError(res?.error ?? "");
    });
  }

  return (
    <section className="border p-4 space-y-2">
      <h2 className="font-semibold">The vibe</h2>
      <p>Dress code: {dressCode || "Not set"}</p>
      <p>Countdown: {eventDate ? (remaining ?? "…") : "No date set"}</p>

      {isHost && (
        <form onSubmit={submit} className="space-y-2 border-t pt-2">
          <input
            name="dressCode"
            defaultValue={dressCode ?? ""}
            placeholder="Dress code"
            className="border p-2 w-full"
          />
          <input
            name="date"
            type="datetime-local"
            defaultValue={eventDate ? eventDate.slice(0, 16) : ""}
            className="border p-2 w-full"
          />
          <button type="submit" disabled={pending} className="border p-2 w-full">
            Save vibe
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>
      )}
    </section>
  );
}

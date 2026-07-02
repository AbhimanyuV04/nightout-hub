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
    <section className="card space-y-3">
      <h2 className="font-semibold">The vibe</h2>
      <div className="space-y-1">
        <p className="muted text-sm">Dress code</p>
        <p className="text-lg">{dressCode || "Not set"}</p>
      </div>
      <div className="space-y-1">
        <p className="muted text-sm">Countdown</p>
        <p className="text-2xl font-semibold tracking-tight text-[#FF375F]">
          {eventDate ? (remaining ?? "…") : "No date set"}
        </p>
      </div>

      {isHost && (
        <form onSubmit={submit} className="space-y-3 border-t border-zinc-800 pt-3">
          <input
            name="dressCode"
            defaultValue={dressCode ?? ""}
            placeholder="Dress code"
            className="field"
          />
          <input
            name="date"
            type="datetime-local"
            defaultValue={eventDate ? eventDate.slice(0, 16) : ""}
            className="field [color-scheme:dark]"
          />
          <button type="submit" disabled={pending} className="btn-primary">
            Save vibe
          </button>
          {error && <p className="text-sm text-[#FF375F]">{error}</p>}
        </form>
      )}
    </section>
  );
}

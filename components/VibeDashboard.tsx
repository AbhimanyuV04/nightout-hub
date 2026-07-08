"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { archiveRoom, updateRoomSettings } from "@/app/actions";
import ConfirmDialog from "./ConfirmDialog";

type Parts = { days: number; hours: number; mins: number; secs: number; done: boolean };

function remainingParts(ms: number): Parts {
  const s = Math.floor(Math.max(0, ms) / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    mins: Math.floor((s % 3600) / 60),
    secs: s % 60,
    done: ms <= 0,
  };
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
  const [parts, setParts] = useState<Parts | null>(null);
  const [dateLabel, setDateLabel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!eventDate) {
      setParts(null);
      setDateLabel(null);
      return;
    }
    // Formatted client-side so it reads in the viewer's own timezone (and avoids SSR mismatch).
    setDateLabel(
      new Date(eventDate).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    );
    const target = new Date(eventDate).getTime();
    const tick = () => setParts(remainingParts(target - Date.now()));
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
      const res = await updateRoomSettings(roomCode, dc, date);
      setError(res?.error ?? "");
    });
  }

  function doArchive() {
    startTransition(async () => {
      const res = await archiveRoom(roomCode);
      setConfirmArchive(false);
      // Success redirects away; only an error returns here.
      setError(res?.error ?? "");
    });
  }

  return (
    <section className="card space-y-4">
      <h2 className="section-title">The vibe</h2>

      <div className="space-y-1">
        <p className="muted text-sm">Dress code</p>
        <p className="text-lg">{dressCode || "Not set"}</p>
      </div>

      <div className="space-y-2">
        <p className="muted text-sm">Countdown</p>
        {dateLabel && <p className="text-base font-semibold tracking-tight">{dateLabel}</p>}
        {!eventDate ? (
          <p className="text-lg text-[#8E8E93]">No date set</p>
        ) : !parts ? (
          <p className="muted text-lg">…</p>
        ) : parts.done ? (
          <motion.p
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="bg-gradient-to-r from-[#FF375F] to-[#FF8FA3] bg-clip-text text-2xl font-bold tracking-tight text-transparent"
          >
            It&apos;s happening now! 🎉
          </motion.p>
        ) : (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111111]/60 p-3">
            <div className="pointer-events-none absolute -top-12 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-[#FF375F]/25 blur-3xl" />
            <div className="relative grid grid-cols-4 gap-2">
              <Unit value={parts.days} label="Days" />
              <Unit value={parts.hours} label="Hrs" />
              <Unit value={parts.mins} label="Min" />
              <Unit value={parts.secs} label="Sec" />
            </div>
          </div>
        )}
      </div>

      {isHost && (
        <div className="space-y-3 border-t border-zinc-800 pt-3">
          <p className="muted text-xs uppercase tracking-widest">Host settings</p>
          <form onSubmit={submit} className="space-y-3">
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
              Save settings
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConfirmArchive(true)}
            disabled={pending}
            className="btn-ghost w-full py-3 text-[#FF375F]"
          >
            Archive room
          </button>
          {error && <p className="text-sm text-[#FF375F]">{error}</p>}
        </div>
      )}

      <ConfirmDialog
        open={confirmArchive}
        title="Archive this night?"
        message="Members will lose access to this room. This can't be undone."
        confirmLabel="Archive"
        pending={pending}
        onConfirm={doArchive}
        onCancel={() => setConfirmArchive(false)}
      />
    </section>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  const text = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-14 w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#1C1C1E]/70">
        {/* Every unit slides when its digits change (keyed on text, so idle units sit still). */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bg-gradient-to-b from-white to-[#FF8FA3] bg-clip-text text-2xl font-bold tabular-nums text-transparent"
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="muted text-[10px] uppercase tracking-widest">{label}</span>
    </div>
  );
}

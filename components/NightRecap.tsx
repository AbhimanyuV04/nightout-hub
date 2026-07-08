"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type RecapData = {
  roomCode: string;
  memberCount: number;
  totalSpent: number;
  photoCount: number;
  topPlace: string | null;
  topQuote: { text: string; speaker: string } | null;
  eventDate: string | null;
};

// The night, wrapped: an animated full-screen recap plus a shareable 1080×1350 card drawn
// straight to canvas (no html-to-image dependency).
export default function NightRecap(props: RecapData) {
  const [open, setOpen] = useState(false);
  const hasAnything =
    props.totalSpent > 0 || props.photoCount > 0 || !!props.topPlace || !!props.topQuote;
  if (!hasAnything) return null; // nothing to recap yet

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(true)}
        className="card relative w-full overflow-hidden text-left"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FF375F]/30 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="section-title">Night Recap ✨</h2>
            <p className="muted text-sm">The story of {props.roomCode}, wrapped</p>
          </div>
          <span className="text-2xl">→</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {open && <RecapOverlay {...props} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function RecapOverlay({ onClose, ...d }: RecapData & { onClose: () => void }) {
  const stats: { emoji: string; label: string; value: string }[] = [
    { emoji: "👥", label: "The crew", value: `${d.memberCount}` },
    ...(d.totalSpent > 0
      ? [{ emoji: "💸", label: "Total damage", value: `₹${d.totalSpent.toFixed(0)}` }]
      : []),
    ...(d.photoCount > 0
      ? [{ emoji: "📸", label: "Memories captured", value: `${d.photoCount}` }]
      : []),
    ...(d.topPlace ? [{ emoji: "📍", label: "The spot", value: d.topPlace }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 24, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 24, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#111111] p-6 shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#FF375F]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-[#FF375F]/15 blur-3xl" />

        <div className="relative space-y-5">
          <div>
            <p className="muted text-xs uppercase tracking-widest">NightOut · {d.roomCode}</p>
            <h2 className="bg-gradient-to-r from-[#FF375F] to-[#FF8FA3] bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              The Night
            </h2>
            {d.eventDate && (
              <p className="muted mt-1 text-sm">
                {new Date(d.eventDate).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.14, type: "spring", stiffness: 300, damping: 24 }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1C1C1E]/70 px-3 py-2.5"
              >
                <span className="text-xl">{s.emoji}</span>
                <span className="muted flex-1 text-sm">{s.label}</span>
                <span className="max-w-[45%] truncate text-right font-bold">{s.value}</span>
              </motion.div>
            ))}

            {d.topQuote && (
              <motion.blockquote
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + stats.length * 0.14, type: "spring", stiffness: 300, damping: 24 }}
                className="rounded-xl border border-[#FF375F]/25 bg-[#FF375F]/10 px-4 py-3"
              >
                <p className="leading-snug">&ldquo;{d.topQuote.text}&rdquo;</p>
                <p className="muted mt-1 text-sm">— {d.topQuote.speaker}</p>
              </motion.blockquote>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => shareCard(d)} className="btn-primary flex-1">
              Share card
            </button>
            <button type="button" onClick={onClose} className="btn-ghost px-5">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// 1080×1350 (4:5, IG-friendly) card rendered by hand — gradient wash, big stats, the quote.
function drawCard(d: RecapData): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = 1350;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, 1080, 1350);
  const glow = (x: number, y: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255, 55, 95, ${a})`);
    g.addColorStop(1, "rgba(255, 55, 95, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1350);
  };
  glow(1080, 0, 700, 0.35);
  glow(0, 1350, 600, 0.22);

  ctx.fillStyle = "#8E8E93";
  ctx.font = "600 34px system-ui, sans-serif";
  ctx.fillText(`NIGHTOUT  ·  ${d.roomCode}`, 80, 130);

  const grad = ctx.createLinearGradient(80, 0, 700, 0);
  grad.addColorStop(0, "#FF375F");
  grad.addColorStop(1, "#FF8FA3");
  ctx.fillStyle = grad;
  ctx.font = "bold 110px system-ui, sans-serif";
  ctx.fillText("The Night", 80, 260);

  if (d.eventDate) {
    ctx.fillStyle = "#8E8E93";
    ctx.font = "500 36px system-ui, sans-serif";
    ctx.fillText(
      new Date(d.eventDate).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
      80,
      325
    );
  }

  const stats: [string, string][] = [
    ["👥  The crew", `${d.memberCount}`],
    ...(d.totalSpent > 0 ? [["💸  Total damage", `₹${d.totalSpent.toFixed(0)}`] as [string, string]] : []),
    ...(d.photoCount > 0 ? [["📸  Memories", `${d.photoCount}`] as [string, string]] : []),
    ...(d.topPlace ? [["📍  The spot", d.topPlace] as [string, string]] : []),
  ];
  let y = 440;
  for (const [label, value] of stats) {
    ctx.fillStyle = "rgba(28, 28, 30, 0.85)";
    roundRect(ctx, 80, y, 920, 110, 24);
    ctx.fill();
    ctx.fillStyle = "#8E8E93";
    ctx.font = "500 38px system-ui, sans-serif";
    ctx.fillText(label, 115, y + 68);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 44px system-ui, sans-serif";
    const text = value.length > 22 ? value.slice(0, 21) + "…" : value;
    ctx.fillText(text, 965 - ctx.measureText(text).width, y + 70); // right-aligned in the row
    y += 140;
  }

  if (d.topQuote) {
    ctx.fillStyle = "rgba(255, 55, 95, 0.12)";
    roundRect(ctx, 80, y + 10, 920, 190, 24);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "italic 600 40px system-ui, sans-serif";
    const quote = `“${d.topQuote.text}”`;
    ctx.fillText(quote.length > 44 ? quote.slice(0, 43) + "…”" : quote, 115, y + 90);
    ctx.fillStyle = "#FF8FA3";
    ctx.font = "500 34px system-ui, sans-serif";
    ctx.fillText(`— ${d.topQuote.speaker}`, 115, y + 150);
  }

  ctx.fillStyle = "#8E8E93";
  ctx.font = "500 30px system-ui, sans-serif";
  ctx.fillText("made with NightOut", 80, 1280);

  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function shareCard(d: RecapData) {
  const blob = await drawCard(d);
  if (!blob) return;
  const file = new File([blob], `nightout-${d.roomCode}.png`, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] }).catch(() => {}); // user cancelled — fine
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

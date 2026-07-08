"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const EMOJI = ["🎉", "🍾", "💸", "✨"];

// Shown when every debt in the room nets to zero — a one-shot confetti burst contained
// inside the card. Pure framer-motion, replays whenever the split tab remounts.
export default function SettledCelebration() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.4 + Math.random(),
        rotate: (Math.random() - 0.5) * 360,
        emoji: EMOJI[i % EMOJI.length],
      })),
    []
  );

  return (
    <section className="card relative overflow-hidden py-8 text-center">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {pieces.map((p, i) => (
          <motion.span
            key={i}
            initial={{ y: -30, opacity: 1, rotate: 0 }}
            animate={{ y: 240, opacity: 0, rotate: p.rotate }}
            transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
            className="absolute text-xl"
            style={{ left: `${p.left}%` }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </div>
      <motion.p
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="bg-gradient-to-r from-[#FF375F] to-[#FF8FA3] bg-clip-text text-2xl font-bold tracking-tight text-transparent"
      >
        All squared up 🎉
      </motion.p>
      <p className="muted mt-1 text-sm">No one owes anyone. Legendary.</p>
    </section>
  );
}

"use client";

import { useOptimistic, useTransition } from "react";
import { motion } from "framer-motion";
import { toggleReaction } from "@/app/actions";
import { REACTION_EMOJI } from "@/lib/reactions";

type Reaction = { emoji: string; user_id: string };

// Row of emoji chips with an optimistic toggle — the pop is instant, the server catches up
// via revalidatePath.
export default function Reactions({
  roomCode,
  targetType,
  targetId,
  reactions,
  meId,
}: {
  roomCode: string;
  targetType: "media" | "quote";
  targetId: string;
  reactions: Reaction[];
  meId: string | null;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, applyToggle] = useOptimistic(reactions, (state: Reaction[], emoji: string) => {
    if (!meId) return state;
    const mine = state.some((r) => r.emoji === emoji && r.user_id === meId);
    return mine
      ? state.filter((r) => !(r.emoji === emoji && r.user_id === meId))
      : [...state, { emoji, user_id: meId }];
  });

  return (
    <div className="flex gap-1.5">
      {REACTION_EMOJI.map((emoji) => {
        const count = optimistic.filter((r) => r.emoji === emoji).length;
        const mine = !!meId && optimistic.some((r) => r.emoji === emoji && r.user_id === meId);
        return (
          <motion.button
            key={emoji}
            type="button"
            disabled={!meId}
            whileTap={{ scale: 1.4, rotate: -8 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            onClick={() =>
              startTransition(async () => {
                applyToggle(emoji);
                await toggleReaction(roomCode, targetType, targetId, emoji);
              })
            }
            aria-label={`React with ${emoji}`}
            className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm backdrop-blur-md transition ${
              mine
                ? "border-[#FF375F]/60 bg-[#FF375F]/20 shadow-[0_0_10px_-2px_rgba(255,55,95,0.6)]"
                : "border-white/10 bg-white/5"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className={`text-xs font-semibold ${mine ? "text-[#FF8FA3]" : "text-[#8E8E93]"}`}>
                {count}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

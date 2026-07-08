// Shared between the server action (validation) and the client chips (rendering).
export const REACTION_EMOJI = ["🔥", "😂", "❤️", "🍻"] as const;

export type ReactionRow = {
  target_type: "media" | "quote";
  target_id: string;
  emoji: string;
  user_id: string;
};

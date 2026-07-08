"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reactions from "./Reactions";

type MediaItem = { id: string; image_url: string; user_id: string };
type Member = { id: string; display_name: string };
type Reaction = { target_id: string; emoji: string; user_id: string };

type Group = { userId: string; name: string; items: MediaItem[] };

function groupByUploader(media: MediaItem[], members: Member[]): Group[] {
  const nameById = new Map(members.map((m) => [m.id, m.display_name]));
  const order: string[] = [];
  const byUser = new Map<string, MediaItem[]>();
  for (const m of media) {
    if (!byUser.has(m.user_id)) {
      byUser.set(m.user_id, []);
      order.push(m.user_id);
    }
    byUser.get(m.user_id)!.push(m);
  }
  return order.map((userId) => ({
    userId,
    name: nameById.get(userId) ?? "Someone",
    items: byUser.get(userId)!,
  }));
}

// Force a real download of a cross-origin Storage URL (the `download` attr is ignored
// cross-origin, so fetch the blob first). Falls back to opening the image if fetch fails.
async function downloadOne(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    window.open(url, "_blank");
  }
}

async function downloadGroup(g: Group) {
  const safe = g.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "nightout";
  for (let i = 0; i < g.items.length; i++) {
    await downloadOne(g.items[i].image_url, `${safe}-${i + 1}.jpg`);
  }
}

export default function MediaGallery({
  media,
  members,
  roomCode,
  meId,
  reactions,
}: {
  media: MediaItem[];
  members: Member[];
  roomCode: string;
  meId: string | null;
  reactions: Reaction[];
}) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const groups = groupByUploader(media, members);

  // Tile badge: total reactions on a photo, fronted by its most-used emoji.
  function badgeFor(id: string): { emoji: string; count: number } | null {
    const rs = reactions.filter((r) => r.target_id === id);
    if (!rs.length) return null;
    const counts = new Map<string, number>();
    for (const r of rs) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    const [emoji] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    return { emoji, count: rs.length };
  }

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!media.length) {
    return (
      <section className="card">
        <p className="muted text-sm">No photos yet — be the first to capture the night.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <motion.section
          key={g.userId}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="relative space-y-3 overflow-hidden rounded-2xl border border-white/10 bg-[#1C1C1E]/60 p-4 shadow-lg shadow-black/40 backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#FF375F]/25 blur-3xl" />
          <div className="relative flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold tracking-tight">
              The night from{" "}
              <span className="bg-gradient-to-r from-[#FF375F] to-[#FF8FA3] bg-clip-text text-transparent">
                {`${g.name}’s`}
              </span>{" "}
              eyes
            </h3>
            <button
              type="button"
              onClick={() => downloadGroup(g)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition active:scale-95"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              All
            </button>
          </div>
          <div className="relative grid grid-cols-3 gap-2">
            {g.items.map((m, i) => (
              <div key={m.id} className="relative">
                <motion.img
                  src={m.image_url}
                  alt={`Photo from ${g.name}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setLightbox(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setLightbox(m);
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                  className="aspect-square w-full cursor-pointer rounded-xl object-cover ring-1 ring-white/5"
                />
                <button
                  type="button"
                  onClick={() => downloadOne(m.image_url, `${g.name.replace(/[^a-z0-9]+/gi, "-")}-${i + 1}.jpg`)}
                  aria-label="Download photo"
                  className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition active:scale-90"
                >
                  <DownloadIcon className="h-3.5 w-3.5" />
                </button>
                {(() => {
                  const b = badgeFor(m.id);
                  return b ? (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {b.emoji} {b.count}
                    </span>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        </motion.section>
      ))}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.img
              src={lightbox.image_url}
              alt="Expanded photo"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (lightbox) downloadOne(lightbox.image_url, "nightout-photo.jpg");
              }}
              aria-label="Download photo"
              className="absolute right-16 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md active:scale-90"
            >
              <DownloadIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close photo"
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl text-white backdrop-blur-md active:scale-90"
            >
              ✕
            </button>
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-2 backdrop-blur-md"
            >
              <Reactions
                roomCode={roomCode}
                targetType="media"
                targetId={lightbox.id}
                reactions={reactions.filter((r) => r.target_id === lightbox.id)}
                meId={meId}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

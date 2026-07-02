"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type MediaItem = { id: string; image_url: string; user_id: string };
type Member = { id: string; display_name: string };

type Group = { userId: string; name: string; items: MediaItem[] };

// Group photos by uploader, preserving the incoming (most-recent-first) order both for
// groups and for tiles within a group.
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

export default function MediaGallery({
  media,
  members,
}: {
  media: MediaItem[];
  members: Member[];
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const groups = groupByUploader(media, members);

  // Close the lightbox on Escape.
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
          {/* accent glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#FF375F]/25 blur-3xl" />
          <h3 className="relative text-lg font-semibold tracking-tight">
            The night from{" "}
            <span className="bg-gradient-to-r from-[#FF375F] to-[#FF8FA3] bg-clip-text text-transparent">
              {`${g.name}’s`}
            </span>{" "}
            eyes
          </h3>
          <div className="relative grid grid-cols-3 gap-2">
            {g.items.map((m, i) => (
              <motion.img
                key={m.id}
                src={m.image_url}
                alt={`Photo from ${g.name}`}
                role="button"
                tabIndex={0}
                onClick={() => setLightbox(m.image_url)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLightbox(m.image_url);
                  }
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                className="aspect-square w-full cursor-pointer rounded-xl object-cover ring-1 ring-white/5"
              />
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
              src={lightbox}
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
              onClick={() => setLightbox(null)}
              aria-label="Close photo"
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-xl text-white backdrop-blur-md active:scale-90"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

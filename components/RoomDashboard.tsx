"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import AddExpenseForm from "./AddExpenseForm";
import EditMyName from "./EditMyName";
import ItineraryPoll from "./ItineraryPoll";
import LocationShare from "./LocationShare";
import MediaGallery from "./MediaGallery";
import MediaUpload from "./MediaUpload";
import QuoteBoard from "./QuoteBoard";
import VibeDashboard from "./VibeDashboard";

type Member = { id: string; display_name: string; is_host: boolean };
type Expense = { id: string; description: string; amount: number | string; paid_by_user_id: string };
type Debt = { fromName: string; toName: string; amount: number; upiLink: string | null };
type MediaItem = { id: string; image_url: string; user_id: string };
type Suggestion = { id: string; place_name: string; upvotes_count: number };
type Quote = { id: string; quote_text: string; speaker_name: string };

type Tab = "vibe" | "split" | "map" | "media" | "quotes";
const VALID_TABS: Tab[] = ["vibe", "split", "map", "media", "quotes"];

export default function RoomDashboard({
  roomId,
  roomCode,
  members,
  me,
  vibe,
  suggestions,
  quotes,
  expenses,
  debts,
  media,
}: {
  roomId: string;
  roomCode: string;
  members: Member[];
  me: Member | null;
  vibe: { dress_code: string | null; event_date: string | null } | null;
  suggestions: Suggestion[];
  quotes: Quote[];
  expenses: Expense[];
  debts: Debt[];
  media: MediaItem[];
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [active, setActiveState] = useState<Tab>(
    VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "vibe"
  );
  const nameById = new Map(members.map((m) => [m.id, m.display_name]));

  // Persist the active tab in the URL so a refresh restores your place.
  // replaceState avoids a Next navigation (no server re-fetch, no history spam).
  function setActive(tab: Tab) {
    setActiveState(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
  }

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: "vibe", label: "Vibe", icon: <HomeIcon /> },
    { id: "split", label: "Split", icon: <WalletIcon /> },
    { id: "map", label: "Map", icon: <MapIcon /> },
    { id: "media", label: "Media", icon: <CameraIcon /> },
    { id: "quotes", label: "Quotes", icon: <ChatIcon /> },
  ];
  const activeLabel = tabs.find((t) => t.id === active)?.label ?? "";

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-[#111111]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <div>
            <p className="muted text-xs uppercase tracking-widest">NightOut</p>
            <h1 className="text-lg font-bold tracking-tight">
              {activeLabel} · {roomCode}
            </h1>
          </div>
          <span className="rounded-full bg-[#1C1C1E] px-3 py-1 text-sm text-[#8E8E93]">
            {members.length} in
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-24 pt-4">
        {/* Map stays mounted across tab switches (outside AnimatePresence) so the realtime
            channel + geolocation watch survive — unmounting it would drop live sharing. */}
        <div className={active === "map" ? "space-y-4" : "hidden"}>
          <LocationShare
            roomCode={roomCode}
            userId={me?.id ?? null}
            userName={me?.display_name ?? null}
          />
        </div>

        <AnimatePresence mode="wait">
          {active !== "map" && (
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="space-y-4"
            >
              {active === "vibe" && (
                <>
                  <VibeDashboard
                    roomCode={roomCode}
                    dressCode={vibe?.dress_code ?? null}
                    eventDate={vibe?.event_date ?? null}
                    isHost={me?.is_host ?? false}
                  />
                  <ItineraryPoll roomCode={roomCode} suggestions={suggestions} />
                  <section className="card space-y-2">
                    <h2 className="section-title">Members</h2>
                    <ul className="space-y-1.5">
                      {members.map((u) => (
                        <li key={u.id} className="flex items-center justify-between gap-2">
                          <span>
                            {u.display_name}
                            {u.id === me?.id && <span className="muted text-xs"> (you)</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            {u.is_host && <span className="muted text-xs">host</span>}
                            {u.id === me?.id && (
                              <EditMyName roomCode={roomCode} currentName={u.display_name} />
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

              {active === "split" && (
                <>
                  <AddExpenseForm roomId={roomId} roomCode={roomCode} members={members} />
                  <section className="card space-y-2">
                    <h2 className="section-title">Expenses</h2>
                    {!expenses.length && <p className="muted text-sm">Nothing yet</p>}
                    <ul className="space-y-2">
                      {expenses.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2">
                          <span>
                            {e.description}{" "}
                            <span className="muted text-sm">
                              · {nameById.get(e.paid_by_user_id) ?? "?"}
                            </span>
                          </span>
                          <span className="font-medium">₹{Number(e.amount).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="card space-y-2">
                    <h2 className="section-title">Who owes whom</h2>
                    {!debts.length && <p className="muted text-sm">All settled</p>}
                    <ul className="space-y-2">
                      {debts.map((d, i) => (
                        <li key={i} className="flex items-center justify-between gap-2">
                          <span>
                            {d.fromName} <span className="muted">→</span> {d.toName}{" "}
                            <span className="font-medium">₹{d.amount.toFixed(2)}</span>
                          </span>
                          {d.upiLink && (
                            <a
                              href={d.upiLink}
                              className="rounded-lg bg-[#FF375F] px-3 py-1 text-sm font-medium text-white transition-all active:scale-95"
                            >
                              Pay
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

              {active === "media" && (
                <>
                  <MediaUpload roomCode={roomCode} />
                  <MediaGallery media={media} members={members} />
                </>
              )}

              {active === "quotes" && <QuoteBoard roomCode={roomCode} quotes={quotes} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-zinc-800 bg-[#1C1C1E]/90 backdrop-blur-md">
        <div className="mx-auto grid h-full max-w-md grid-cols-5">
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center justify-center gap-1 text-[10px] ${
                  isActive ? "text-[#FF375F]" : "text-[#8E8E93]"
                }`}
              >
                <motion.span
                  animate={{ scale: isActive ? 1.15 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="flex items-center justify-center"
                >
                  {t.icon}
                </motion.span>
                {t.label}
              </motion.button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function svgProps() {
  return {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

function HomeIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V9.5Z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2" />
      <path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H4" />
      <circle cx="16" cy="13" r="1.2" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M4 8a2 2 0 0 1 2-2h1l1.2-2h5.6L15 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4Z" />
    </svg>
  );
}

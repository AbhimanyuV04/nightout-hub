"use client";

import { useEffect, useState, useActionState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createRoom, joinRoom } from "./actions";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

const PILLARS = [
  { icon: "🏠", title: "VIP Vibe Check & Sync", desc: "Lock the dress code, date and plan — the whole crew on the same page." },
  { icon: "💸", title: "Intelligent UPI Invoice Splitting", desc: "Scan the bill, split it fairly, settle up in a single UPI tap." },
  { icon: "🗺️", title: "Ephemeral Real-Time Map Radar", desc: "See everyone on the map tonight — the trail vanishes by morning." },
  { icon: "📸", title: "Compressed Shared Media Storage", desc: "Drop photos into one shared gallery, auto-compressed on device." },
  { icon: "💬", title: "Group Live Quote Terminal", desc: "Immortalise the night's best one-liners the moment they land." },
];

function nameFromSession(session: Session | null): string | null {
  if (!session) return null;
  const meta = session.user.user_metadata ?? {};
  return (
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    session.user.email ||
    "there"
  );
}

export default function Home() {
  // undefined = still checking the session; null = signed out; string = signed-in name.
  const [name, setName] = useState<string | null | undefined>(undefined);
  const [createState, createAction, creating] = useActionState(createRoom, null);
  const [joinState, joinAction, joining] = useActionState(joinRoom, null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setName(nameFromSession(data.session)));
    // Official auth listener: keep the UI in sync with Google sign-in / sign-out.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setName(nameFromSession(session))
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-10 px-5 py-12">
      <header className="space-y-3 text-center">
        <p className="muted text-xs font-medium uppercase tracking-[0.3em]">NightOut Hub</p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          One night. One crew.
          <br />
          <span className="text-[#FF375F]">Zero logistics.</span>
        </h1>
        <p className="muted text-base">
          Plan the vibe, split the bill, share the memories — all in a room that disappears after.
        </p>
      </header>

      <section className="space-y-3">
        {PILLARS.map((p) => (
          <article
            key={p.title}
            className="card flex items-start gap-3 transition-transform active:scale-[0.98]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#111111] text-xl">
              {p.icon}
            </span>
            <div className="space-y-0.5">
              <h2 className="font-semibold leading-snug">{p.title}</h2>
              <p className="muted text-sm leading-snug">{p.desc}</p>
            </div>
          </article>
        ))}
      </section>

      {name === undefined ? (
        <div className="card h-14 animate-pulse" aria-hidden />
      ) : name === null ? (
        <button
          onClick={signInWithGoogle}
          className="btn-primary flex items-center justify-center gap-3"
        >
          <GoogleGlyph />
          Continue with Google
        </button>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm">
              Signed in as <span className="font-semibold">{name}</span>
            </p>
            <button onClick={signOut} className="muted text-sm underline underline-offset-4">
              Sign out
            </button>
          </div>

          <form action={createAction} className="card space-y-3">
            <h2 className="text-lg font-semibold">Create a NightOut</h2>
            <p className="muted text-sm">You&apos;ll host the room and get a code to share.</p>
            <input name="upi" placeholder="Your UPI ID (optional, e.g. name@bank)" className="field" />
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Creating..." : "Create a NightOut"}
            </button>
            {createState?.error && <p className="text-sm text-[#FF375F]">{createState.error}</p>}
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-zinc-800" />
            <span className="muted text-xs uppercase tracking-widest">or</span>
            <span className="h-px flex-1 bg-zinc-800" />
          </div>

          <form action={joinAction} className="card space-y-3">
            <h2 className="text-lg font-semibold">Join with Code</h2>
            <input
              name="code"
              placeholder="Room code (e.g. DXB492)"
              required
              maxLength={6}
              className="field uppercase tracking-[0.3em]"
            />
            <input name="upi" placeholder="Your UPI ID (optional, e.g. name@bank)" className="field" />
            <button type="submit" disabled={joining} className="btn-primary">
              {joining ? "Joining..." : "Join with Code"}
            </button>
            {joinState?.error && <p className="text-sm text-[#FF375F]">{joinState.error}</p>}
          </form>
        </section>
      )}
    </main>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
        transform="scale(0.5)"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
        transform="scale(0.5)"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        transform="scale(0.5)"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.2C41.9 35.9 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"
        transform="scale(0.5)"
      />
    </svg>
  );
}

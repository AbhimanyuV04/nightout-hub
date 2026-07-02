"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
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

  if (name === undefined) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-12">
        <div className="card h-40 animate-pulse" aria-hidden />
      </main>
    );
  }

  // Signed in → the hub: two doors, "My Nights" and "Tonight".
  if (name) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-5 py-12">
        <header className="flex items-start justify-between">
          <div>
            <p className="muted text-xs uppercase tracking-[0.3em]">NightOut Hub</p>
            <h1 className="text-3xl font-bold tracking-tight">Hey {name}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link href="/settings" className="muted text-sm underline underline-offset-4">
              Settings
            </Link>
            <button onClick={signOut} className="muted text-sm underline underline-offset-4">
              Sign out
            </button>
          </div>
        </header>

        <div className="space-y-4">
          <Link
            href="/nights"
            className="card flex items-center justify-between gap-3 transition-transform active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <h2 className="section-title">My Nights</h2>
              <p className="muted text-sm">Relive past nights and jump back into ongoing ones.</p>
            </div>
            <span aria-hidden className="text-2xl">🌙</span>
          </Link>

          <Link
            href="/tonight"
            className="card flex items-center justify-between gap-3 transition-transform active:scale-[0.98]"
          >
            <div className="space-y-0.5">
              <h2 className="section-title">Tonight</h2>
              <p className="muted text-sm">Start a new nightout or join with a code.</p>
            </div>
            <span aria-hidden className="text-2xl">🎉</span>
          </Link>
        </div>
      </main>
    );
  }

  // Signed out → the feature pitch + Google CTA.
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-10 px-5 py-12">
      <header className="space-y-3 text-center">
        <p className="muted text-xs font-medium uppercase tracking-[0.3em]">NightOut Hub</p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight">
          One night. One crew.
          <br />
          <span className="bg-gradient-to-r from-[#FF375F] to-[#FF8FA3] bg-clip-text text-transparent">
            Zero logistics.
          </span>
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

      <button
        onClick={signInWithGoogle}
        className="btn-primary flex items-center justify-center gap-3"
      >
        <GoogleGlyph />
        Continue with Google
      </button>
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

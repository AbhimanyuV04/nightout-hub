"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createRoom, joinRoom } from "../actions";

export default function Tonight() {
  const [createState, createAction, creating] = useActionState(createRoom, null);
  const [joinState, joinAction, joining] = useActionState(joinRoom, null);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-12">
      <header className="space-y-1">
        <Link href="/" className="muted text-sm">
          ← Home
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Tonight</h1>
        <p className="muted">Start a new nightout or join an existing one.</p>
      </header>

      <form action={createAction} className="card space-y-3">
        <h2 className="section-title">Create a NightOut</h2>
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
        <h2 className="section-title">Join with Code</h2>
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
    </main>
  );
}

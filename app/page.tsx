"use client";

import { useActionState } from "react";
import { createRoom, joinRoom } from "./actions";

export default function Home() {
  const [createState, createAction, creating] = useActionState(createRoom, null);
  const [joinState, joinAction, joining] = useActionState(joinRoom, null);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-5 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">NightOut Hub</h1>
        <p className="muted">Plan the night, split the bill, share the vibe.</p>
      </header>

      <form action={createAction} className="card space-y-3">
        <h2 className="text-lg font-semibold">Create a NightOut</h2>
        <input name="name" placeholder="Your name" required className="field" />
        <input name="upi" placeholder="UPI ID (optional, e.g. name@bank)" className="field" />
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
        <h2 className="text-lg font-semibold">Join a NightOut</h2>
        <input name="name" placeholder="Your name" required className="field" />
        <input
          name="code"
          placeholder="Room code (e.g. DXB492)"
          required
          maxLength={6}
          className="field uppercase tracking-[0.3em]"
        />
        <input name="upi" placeholder="UPI ID (optional, e.g. name@bank)" className="field" />
        <button type="submit" disabled={joining} className="btn-primary">
          {joining ? "Joining..." : "Join a NightOut"}
        </button>
        {joinState?.error && <p className="text-sm text-[#FF375F]">{joinState.error}</p>}
      </form>
    </main>
  );
}

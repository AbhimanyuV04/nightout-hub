"use client";

import { useActionState } from "react";
import { createRoom, joinRoom } from "./actions";

export default function Home() {
  const [createState, createAction, creating] = useActionState(createRoom, null);
  const [joinState, joinAction, joining] = useActionState(joinRoom, null);

  return (
    <main className="mx-auto max-w-sm p-6 space-y-8">
      <h1 className="text-xl font-bold">NightOut Hub</h1>

      <form action={createAction} className="space-y-2 border p-4">
        <h2 className="font-semibold">Create a NightOut</h2>
        <input name="name" placeholder="Your name" required className="border p-2 w-full" />
        <input name="upi" placeholder="UPI ID (optional, e.g. name@bank)" className="border p-2 w-full" />
        <button type="submit" disabled={creating} className="border p-2 w-full">
          {creating ? "Creating..." : "Create a NightOut"}
        </button>
        {createState?.error && <p className="text-red-600 text-sm">{createState.error}</p>}
      </form>

      <form action={joinAction} className="space-y-2 border p-4">
        <h2 className="font-semibold">Join a NightOut</h2>
        <input name="name" placeholder="Your name" required className="border p-2 w-full" />
        <input
          name="code"
          placeholder="Room code (e.g. DXB492)"
          required
          maxLength={6}
          className="border p-2 w-full uppercase"
        />
        <input name="upi" placeholder="UPI ID (optional, e.g. name@bank)" className="border p-2 w-full" />
        <button type="submit" disabled={joining} className="border p-2 w-full">
          {joining ? "Joining..." : "Join a NightOut"}
        </button>
        {joinState?.error && <p className="text-red-600 text-sm">{joinState.error}</p>}
      </form>
    </main>
  );
}

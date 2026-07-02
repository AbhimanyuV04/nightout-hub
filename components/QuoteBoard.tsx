"use client";

import { useState, useTransition } from "react";
import { addQuote } from "@/app/actions";

type Quote = { id: string; quote_text: string; speaker_name: string };

export default function QuoteBoard({ roomCode, quotes }: { roomCode: string; quotes: Quote[] }) {
  const [text, setText] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = text;
    const s = speaker;
    startTransition(async () => {
      const res = await addQuote(roomCode, q, s);
      if (res?.error) setError(res.error);
      else {
        setError("");
        setText("");
        setSpeaker("");
      }
    });
  }

  return (
    <section className="border p-4 space-y-2">
      <h2 className="font-semibold">Quote board</h2>
      <ul className="max-h-48 overflow-y-auto space-y-1">
        {!quotes.length && <li className="text-sm">No quotes yet</li>}
        {quotes.map((q) => (
          <li key={q.id} className="text-sm">
            &ldquo;{q.quote_text}&rdquo; — {q.speaker_name}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What was said"
          className="border p-2 w-full"
        />
        <input
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          placeholder="Who said it"
          className="border p-2 w-full"
        />
        <button type="submit" disabled={pending} className="border p-2 w-full">
          Log quote
        </button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </section>
  );
}

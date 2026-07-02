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
    <section className="card space-y-3">
      <h2 className="font-semibold">Quote board</h2>
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {!quotes.length && <li className="muted text-sm">No quotes yet</li>}
        {quotes.map((q) => (
          <li key={q.id} className="rounded-xl bg-[#111111] px-3 py-2">
            <p className="leading-snug">&ldquo;{q.quote_text}&rdquo;</p>
            <p className="muted mt-1 text-sm">— {q.speaker_name}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What was said"
          className="field"
        />
        <input
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          placeholder="Who said it"
          className="field"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          Log quote
        </button>
      </form>
      {error && <p className="text-sm text-[#FF375F]">{error}</p>}
    </section>
  );
}

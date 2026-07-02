"use client";

import { useState, useTransition } from "react";
import { updateMyNightName } from "@/app/actions";

export default function EditMyName({
  roomCode,
  currentName,
}: {
  roomCode: string;
  currentName: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await updateMyNightName(roomCode, value);
      if (res?.error) setError(res.error);
      else {
        setError("");
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(currentName);
          setError("");
          setEditing(true);
        }}
        className="muted text-xs underline underline-offset-2"
      >
        edit
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={40}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-28 rounded-lg border border-white/10 bg-[#111111] px-2 py-1 text-sm text-white outline-none focus:border-[#FF375F]"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        aria-label="Save name"
        className="btn-ghost px-2 py-1 text-xs"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        aria-label="Cancel"
        className="muted px-1 text-xs"
      >
        ✕
      </button>
      {error && <span className="text-xs text-[#FF375F]">{error}</span>}
    </span>
  );
}

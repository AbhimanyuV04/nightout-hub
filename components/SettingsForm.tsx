"use client";

import { useState, useTransition } from "react";
import { updateNickname } from "@/app/actions";

export default function SettingsForm({
  nickname,
  defaultName,
}: {
  nickname: string | null;
  defaultName: string;
}) {
  const [value, setValue] = useState(nickname ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | string>("idle");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateNickname(value);
      setStatus(res?.error ?? "saved");
    });
  }

  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="section-title">Nickname</h2>
      <p className="muted text-sm">
        Your default name when you join or create a night. Leave blank to use your Google name
        {defaultName ? ` (${defaultName})` : ""}.
      </p>
      <input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setStatus("idle");
        }}
        maxLength={40}
        placeholder={defaultName || "Your nickname"}
        className="field"
      />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving..." : "Save nickname"}
      </button>
      {status === "saved" && <p className="muted text-sm">Saved ✓</p>}
      {status !== "idle" && status !== "saved" && <p className="text-sm text-[#FF375F]">{status}</p>}
    </form>
  );
}

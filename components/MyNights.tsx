"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hideNight, type NightSummary } from "@/app/actions";
import ConfirmDialog from "./ConfirmDialog";

export default function MyNights({ nights }: { nights: NightSummary[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmRemove() {
    if (!target) return;
    startTransition(async () => {
      const res = await hideNight(target);
      setTarget(null);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  if (!nights.length) {
    return (
      <section className="card space-y-3">
        <p className="muted text-sm">No nights yet — the story starts tonight.</p>
        <Link href="/tonight" className="btn-primary block text-center">
          Start one
        </Link>
      </section>
    );
  }

  const ongoing = nights.filter((n) => n.isActive);
  const past = nights.filter((n) => !n.isActive);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-[#FF375F]">{error}</p>}
      {ongoing.length > 0 && (
        <NightSection title="Ongoing" nights={ongoing} onRemove={setTarget} pending={pending} />
      )}
      {past.length > 0 && (
        <NightSection title="Past" nights={past} onRemove={setTarget} pending={pending} />
      )}

      <ConfirmDialog
        open={target !== null}
        title="Delete these memories?"
        message="This removes the night from your list. Everyone else keeps their photos and this night's data."
        confirmLabel="Delete"
        pending={pending}
        onConfirm={confirmRemove}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}

function NightSection({
  title,
  nights,
  onRemove,
  pending,
}: {
  title: string;
  nights: NightSummary[];
  onRemove: (roomCode: string) => void;
  pending: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="section-title">{title}</h2>
      <ul className="space-y-2">
        {nights.map((n) => (
          <li key={n.roomCode} className="card flex items-center justify-between gap-3">
            <Link href={`/room/${n.roomCode}`} className="min-w-0 flex-1">
              <p className="font-semibold tracking-tight">{n.roomCode}</p>
              <p className="muted truncate text-sm">
                {n.memberCount} {n.memberCount === 1 ? "person" : "people"}
                {n.isHost && " · host"} · {new Date(n.createdAt).toLocaleDateString()}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => onRemove(n.roomCode)}
              disabled={pending}
              aria-label={`Remove ${n.roomCode} from my list`}
              className="btn-ghost px-3 py-2 text-[#FF375F]"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

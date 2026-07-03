import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import EditMyName from "@/components/EditMyName";
import { supabase } from "@/lib/supabase";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default async function GuestsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const roomCode = code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, users(id, display_name, is_host, auth_id)")
    .eq("room_code", roomCode)
    .eq("is_active", true)
    .single();
  if (!room) notFound();

  const supabaseAuth = await getSupabaseServer();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  const meId = user ? room.users.find((u) => u.auth_id === user.id)?.id ?? null : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-12">
      <header className="space-y-1">
        <BackLink href={`/room/${room.room_code}`} label="Room" />
        <h1 className="text-3xl font-bold tracking-tight">Who&apos;s coming</h1>
        <p className="muted">
          {room.users.length} {room.users.length === 1 ? "person" : "people"} in {room.room_code}
        </p>
      </header>

      <section className="card">
        <ul className="divide-y divide-white/5">
          {room.users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-2 py-2.5">
              <span>
                {u.display_name}
                {u.id === meId && <span className="muted text-xs"> (you)</span>}
              </span>
              <div className="flex items-center gap-2">
                {u.is_host && <span className="muted text-xs">host</span>}
                {u.id === meId && (
                  <EditMyName roomCode={room.room_code} currentName={u.display_name} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

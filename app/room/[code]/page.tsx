import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getRoomDebts, getRoomMedia } from "@/app/actions";
import AddExpenseForm from "@/components/AddExpenseForm";
import ItineraryPoll from "@/components/ItineraryPoll";
import LocationShare from "@/components/LocationShare";
import MediaUpload from "@/components/MediaUpload";
import QuoteBoard from "@/components/QuoteBoard";
import VibeDashboard from "@/components/VibeDashboard";
import { supabase } from "@/lib/supabase";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const roomCode = code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, users(id, display_name, is_host)")
    .eq("room_code", roomCode)
    .eq("is_active", true)
    .single();
  if (!room) notFound();

  const [{ data: expenses }, debts, media, { data: vibe }, { data: suggestions }, { data: quotes }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("id, description, amount, paid_by_user_id, created_at")
        .eq("room_id", room.id)
        .order("created_at"),
      getRoomDebts(roomCode),
      getRoomMedia(roomCode),
      supabase.from("vibe_check").select("dress_code, event_date").eq("room_id", room.id).maybeSingle(),
      supabase
        .from("itinerary_suggestions")
        .select("id, place_name, upvotes_count")
        .eq("room_id", room.id)
        .order("upvotes_count", { ascending: false }),
      supabase
        .from("quote_board")
        .select("id, quote_text, speaker_name")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false }),
    ]);
  const nameById = new Map(room.users.map((u) => [u.id, u.display_name]));

  const cookieUserId = (await cookies()).get("nightout_user_id")?.value;
  const me = room.users.find((u) => u.id === cookieUserId) ?? null;

  return (
    <main className="mx-auto max-w-sm p-6 space-y-6">
      <h1 className="text-xl font-bold">Room {room.room_code}</h1>

      <section className="border p-4">
        <h2 className="font-semibold">Members</h2>
        <ul className="space-y-1">
          {room.users.map((u) => (
            <li key={u.id}>
              {u.display_name} {u.is_host && "(host)"}
            </li>
          ))}
        </ul>
      </section>

      <VibeDashboard
        roomCode={room.room_code}
        dressCode={vibe?.dress_code ?? null}
        eventDate={vibe?.event_date ?? null}
        isHost={me?.is_host ?? false}
      />

      <ItineraryPoll roomCode={room.room_code} suggestions={suggestions ?? []} />

      <QuoteBoard roomCode={room.room_code} quotes={quotes ?? []} />

      <LocationShare
        roomCode={room.room_code}
        userId={me?.id ?? null}
        userName={me?.display_name ?? null}
      />

      <AddExpenseForm roomId={room.id} roomCode={room.room_code} members={room.users} />

      <section className="border p-4">
        <h2 className="font-semibold">Expenses</h2>
        {!expenses?.length && <p className="text-sm">Nothing yet</p>}
        <ul className="space-y-1">
          {expenses?.map((e) => (
            <li key={e.id}>
              {e.description} — ₹{Number(e.amount).toFixed(2)} (paid by{" "}
              {nameById.get(e.paid_by_user_id) ?? "?"})
            </li>
          ))}
        </ul>
      </section>

      <MediaUpload roomCode={room.room_code} />

      <section className="border p-4">
        <h2 className="font-semibold">Gallery</h2>
        {!media.length && <p className="text-sm">No photos yet</p>}
        <div className="flex flex-wrap gap-2">
          {media.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.id} src={m.image_url} alt="" className="h-24 w-24 object-cover" />
          ))}
        </div>
      </section>

      <section className="border p-4">
        <h2 className="font-semibold">Who owes whom</h2>
        {!debts.length && <p className="text-sm">All settled</p>}
        <ul className="space-y-1">
          {debts.map((d, i) => (
            <li key={i}>
              {d.fromName} owes {d.toName} ₹{d.amount.toFixed(2)}{" "}
              {d.upiLink && (
                <a href={d.upiLink} className="underline">
                  Pay via UPI
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

import { notFound } from "next/navigation";
import { getRoomDebts, getRoomMedia } from "@/app/actions";
import RoomDashboard from "@/components/RoomDashboard";
import { supabase } from "@/lib/supabase";
import { getSupabaseServer } from "@/lib/supabaseServer";

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const roomCode = code.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code, users(id, display_name, is_host, auth_id)")
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

  const supabaseAuth = await getSupabaseServer();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  const me = user ? room.users.find((u) => u.auth_id === user.id) ?? null : null;

  return (
    <RoomDashboard
      roomId={room.id}
      roomCode={room.room_code}
      members={room.users}
      me={me}
      vibe={vibe ?? null}
      suggestions={suggestions ?? []}
      quotes={quotes ?? []}
      expenses={expenses ?? []}
      debts={debts}
      media={media}
    />
  );
}

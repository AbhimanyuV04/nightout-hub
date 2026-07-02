"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { evenSplit, simplifyDebts } from "@/lib/debtEngine";
import { supabase } from "@/lib/supabase";
import { upiPayLink, VPA_REGEX } from "@/lib/upi";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O/0, I/1/L

function generateRoomCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

export type ActionState = { error: string } | null;

async function setUserCookie(userId: string) {
  (await cookies()).set("nightout_user_id", userId, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
  });
}

function parseUpi(formData: FormData): { upi: string | null } | { error: string } {
  const upi = String(formData.get("upi") ?? "").trim();
  if (upi && !VPA_REGEX.test(upi)) return { error: "Invalid UPI ID (e.g. name@bank)" };
  return { upi: upi || null };
}

type Member = { roomId: string; userId: string; isHost: boolean };

async function resolveMember(roomCode: string): Promise<Member | { error: string }> {
  const userId = (await cookies()).get("nightout_user_id")?.value;
  if (!userId) return { error: "Join the room first" };

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .eq("is_active", true)
    .single();
  if (!room) return { error: "Room not found" };

  const { data: member } = await supabase
    .from("users")
    .select("is_host")
    .eq("id", userId)
    .eq("room_id", room.id)
    .single();
  if (!member) return { error: "You are not in this room" };

  return { roomId: room.id, userId, isHost: member.is_host };
}

export async function createRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };
  const upi = parseUpi(formData);
  if ("error" in upi) return upi;

  let room = null;
  for (let attempt = 0; attempt < 5 && !room; attempt++) {
    const { data, error } = await supabase
      .from("rooms")
      .insert({ room_code: generateRoomCode() })
      .select("id, room_code")
      .single();
    if (data) room = data;
    else if (error.code !== "23505") return { error: "Could not create room" };
  }
  if (!room) return { error: "Could not generate a room code, try again" };

  const { data: host, error: userError } = await supabase
    .from("users")
    .insert({ room_id: room.id, display_name: name, is_host: true, upi_id: upi.upi })
    .select("id")
    .single();
  if (userError) return { error: "Could not create host user" };

  await setUserCookie(host.id);
  redirect(`/room/${room.room_code}`);
}

export async function joinRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!name) return { error: "Name is required" };
  if (!/^[A-Z0-9]{6}$/.test(code)) return { error: "Code must be 6 letters/numbers" };
  const upi = parseUpi(formData);
  if ("error" in upi) return upi;

  const { data: room } = await supabase
    .from("rooms")
    .select("id, room_code")
    .eq("room_code", code)
    .eq("is_active", true)
    .single();
  if (!room) return { error: "Room not found or no longer active" };

  const { data: user, error } = await supabase
    .from("users")
    .insert({ room_id: room.id, display_name: name, upi_id: upi.upi })
    .select("id")
    .single();
  if (error) return { error: "Could not join room" };

  await setUserCookie(user.id);
  redirect(`/room/${room.room_code}`);
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const payerId = (await cookies()).get("nightout_user_id")?.value;
  if (!payerId) return { error: "Join the room first" };

  const roomId = String(formData.get("roomId") ?? "");
  const roomCode = String(formData.get("roomCode") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const participants = formData.getAll("participants").map(String);

  if (!description) return { error: "Description is required" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be positive" };
  if (participants.length === 0) return { error: "Pick at least one participant" };

  const { data: members } = await supabase
    .from("users")
    .select("id")
    .eq("room_id", roomId)
    .in("id", [...new Set([payerId, ...participants])]);
  const memberIds = new Set((members ?? []).map((m) => m.id));
  if (!memberIds.has(payerId) || !participants.every((p) => memberIds.has(p)))
    return { error: "Everyone on the split must be in this room" };

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({ room_id: roomId, paid_by_user_id: payerId, amount: amount.toFixed(2), description })
    .select("id")
    .single();
  if (error) return { error: "Could not add expense" };

  const rows = evenSplit(amount, participants).map((s) => ({
    expense_id: expense.id,
    user_id: s.userId,
    share_amount: s.shareAmount.toFixed(2),
  }));
  const { error: splitError } = await supabase.from("expense_splits").insert(rows);
  if (splitError) {
    // ponytail: manual rollback; move to a plpgsql RPC for real atomicity
    await supabase.from("expenses").delete().eq("id", expense.id);
    return { error: "Could not save splits" };
  }

  revalidatePath(`/room/${roomCode}`);
  return null;
}

export type RoomDebt = {
  fromName: string;
  toName: string;
  amount: number;
  upiLink: string | null;
};

export async function getRoomDebts(roomCode: string): Promise<RoomDebt[]> {
  const { data: room } = await supabase
    .from("rooms")
    .select("id, users(id, display_name, upi_id)")
    .eq("room_code", roomCode.toUpperCase())
    .single();
  if (!room) return [];

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, paid_by_user_id, expense_splits(user_id, share_amount)")
    .eq("room_id", room.id);

  const settlements = simplifyDebts(
    room.users.map((u) => u.id),
    (expenses ?? []).map((e) => ({
      paidBy: e.paid_by_user_id,
      amount: Number(e.amount),
      splits: e.expense_splits.map((s) => ({
        userId: s.user_id,
        shareAmount: Number(s.share_amount),
      })),
    }))
  );

  const byId = new Map(room.users.map((u) => [u.id, u]));
  return settlements.map((s) => {
    const to = byId.get(s.toUser);
    return {
      fromName: byId.get(s.fromUser)?.display_name ?? "Unknown",
      toName: to?.display_name ?? "Unknown",
      amount: s.amount,
      upiLink: to?.upi_id
        ? upiPayLink(to.upi_id, to.display_name, s.amount, `NightOut ${roomCode.toUpperCase()}`)
        : null,
    };
  });
}

export async function saveMediaRecord(roomCode: string, imageUrl: string): Promise<ActionState> {
  const userId = (await cookies()).get("nightout_user_id")?.value;
  if (!userId) return { error: "Join the room first" };

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .eq("is_active", true)
    .single();
  if (!room) return { error: "Room not found" };

  const { data: member } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .eq("room_id", room.id)
    .single();
  if (!member) return { error: "You are not in this room" };

  const { error } = await supabase
    .from("room_media")
    .insert({ room_id: room.id, user_id: userId, image_url: imageUrl });
  if (error) return { error: "Could not save media" };

  revalidatePath(`/room/${roomCode.toUpperCase()}`);
  return null;
}

export type RoomMedia = { id: string; image_url: string; user_id: string; created_at: string };

export async function getRoomMedia(roomCode: string): Promise<RoomMedia[]> {
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .single();
  if (!room) return [];

  const { data } = await supabase
    .from("room_media")
    .select("id, image_url, user_id, created_at")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function updateVibeCheck(
  roomCode: string,
  dressCode: string,
  date: string
): Promise<ActionState> {
  const member = await resolveMember(roomCode);
  if ("error" in member) return member;
  if (!member.isHost) return { error: "Only the host can set the vibe" };

  const eventDate = date ? new Date(date) : null;
  if (eventDate && Number.isNaN(eventDate.getTime())) return { error: "Invalid date" };

  const { error } = await supabase.from("vibe_check").upsert({
    room_id: member.roomId,
    dress_code: dressCode.trim() || null,
    event_date: eventDate?.toISOString() ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save vibe" };

  revalidatePath(`/room/${roomCode.toUpperCase()}`);
  return null;
}

export async function addItinerarySuggestion(roomCode: string, placeName: string): Promise<ActionState> {
  const place = placeName.trim();
  if (!place) return { error: "Place name is required" };

  const member = await resolveMember(roomCode);
  if ("error" in member) return member;

  const { error } = await supabase.from("itinerary_suggestions").insert({
    room_id: member.roomId,
    created_by_user_id: member.userId,
    place_name: place,
  });
  if (error) return { error: "Could not add suggestion" };

  revalidatePath(`/room/${roomCode.toUpperCase()}`);
  return null;
}

// ponytail: read-modify-write; move to an atomic RPC if concurrent votes race
export async function voteItinerary(suggestionId: string, increment: boolean): Promise<ActionState> {
  const userId = (await cookies()).get("nightout_user_id")?.value;
  if (!userId) return { error: "Join the room first" };

  const { data: suggestion } = await supabase
    .from("itinerary_suggestions")
    .select("upvotes_count, rooms(room_code, users(id))")
    .eq("id", suggestionId)
    .single();
  const room = suggestion?.rooms as unknown as { room_code: string; users: { id: string }[] } | null;
  if (!suggestion || !room) return { error: "Suggestion not found" };
  if (!room.users.some((u) => u.id === userId)) return { error: "You are not in this room" };

  const next = Math.max(0, suggestion.upvotes_count + (increment ? 1 : -1));
  const { error } = await supabase
    .from("itinerary_suggestions")
    .update({ upvotes_count: next })
    .eq("id", suggestionId);
  if (error) return { error: "Could not vote" };

  revalidatePath(`/room/${room.room_code}`);
  return null;
}

export async function addQuote(
  roomCode: string,
  quoteText: string,
  speakerName: string
): Promise<ActionState> {
  const quote = quoteText.trim();
  const speaker = speakerName.trim();
  if (!quote) return { error: "Quote is required" };
  if (!speaker) return { error: "Speaker is required" };

  const member = await resolveMember(roomCode);
  if ("error" in member) return member;

  const { error } = await supabase.from("quote_board").insert({
    room_id: member.roomId,
    submitted_by_user_id: member.userId,
    quote_text: quote,
    speaker_name: speaker,
  });
  if (error) return { error: "Could not add quote" };

  revalidatePath(`/room/${roomCode.toUpperCase()}`);
  return null;
}

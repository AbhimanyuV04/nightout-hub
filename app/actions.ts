"use server";

import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { evenSplit, simplifyDebts } from "@/lib/debtEngine";
import { supabase } from "@/lib/supabase";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { upiPayLink, VPA_REGEX } from "@/lib/upi";

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no O/0, I/1/L

function generateRoomCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
}

export type ActionState = { error: string } | null;

// Identity comes from the Supabase Auth (Google) session, not a cookie we set. auth_id is
// the permanent per-person UUID; name is the verified Google profile name.
async function getAuthUser(): Promise<{ authId: string; name: string } | null> {
  const supabaseAuth = await getSupabaseServer();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    user.email ||
    "Guest";
  return { authId: user.id, name };
}

function parseUpi(formData: FormData): { upi: string | null } | { error: string } {
  const upi = String(formData.get("upi") ?? "").trim();
  if (upi && !VPA_REGEX.test(upi)) return { error: "Invalid UPI ID (e.g. name@bank)" };
  return { upi: upi || null };
}

type Member = { roomId: string; userId: string; isHost: boolean };

async function resolveMember(roomCode: string): Promise<Member | { error: string }> {
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .eq("is_active", true)
    .single();
  if (!room) return { error: "Room not found" };

  const { data: member } = await supabase
    .from("users")
    .select("id, is_host")
    .eq("auth_id", auth.authId)
    .eq("room_id", room.id)
    .single();
  if (!member) return { error: "You are not in this room" };

  return { roomId: room.id, userId: member.id, isHost: member.is_host };
}

// A saved global nickname wins over the raw Google name when joining/creating a night.
async function preferredName(authId: string, fallback: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", authId)
    .maybeSingle();
  return data?.nickname?.trim() || fallback;
}

export async function createRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };
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

  const { error: userError } = await supabase
    .from("users")
    .insert({
      room_id: room.id,
      display_name: await preferredName(auth.authId, auth.name),
      is_host: true,
      upi_id: upi.upi,
      auth_id: auth.authId,
    });
  if (userError) return { error: "Could not create host user" };

  redirect(`/room/${room.room_code}`);
}

export async function joinRoom(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
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

  // Idempotent: unique(room_id, auth_id) means re-joining just lands back in the room.
  const { error } = await supabase
    .from("users")
    .insert({
      room_id: room.id,
      display_name: await preferredName(auth.authId, auth.name),
      upi_id: upi.upi,
      auth_id: auth.authId,
    });
  if (error && error.code !== "23505") return { error: "Could not join room" };

  redirect(`/room/${room.room_code}`);
}

export async function addExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };

  const roomId = String(formData.get("roomId") ?? "");
  const roomCode = String(formData.get("roomCode") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const participants = formData.getAll("participants").map(String);

  if (!description) return { error: "Description is required" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be positive" };
  if (participants.length === 0) return { error: "Pick at least one participant" };

  const { data: payer } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", auth.authId)
    .eq("room_id", roomId)
    .single();
  if (!payer) return { error: "You are not in this room" };
  const payerId = payer.id;

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
  const member = await resolveMember(roomCode);
  if ("error" in member) return member;

  const { error } = await supabase
    .from("room_media")
    .insert({ room_id: member.roomId, user_id: member.userId, image_url: imageUrl });
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

// Explicit host authorization: match the caller's auth.uid() against the room's *host*
// user row (not merely "a member"). Shared by every host-only mutation below.
async function resolveHost(roomCode: string): Promise<{ roomId: string } | { error: string }> {
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .eq("is_active", true)
    .single();
  if (!room) return { error: "Room not found" };

  const { data: host } = await supabase
    .from("users")
    .select("auth_id")
    .eq("room_id", room.id)
    .eq("is_host", true)
    .single();
  if (!host || host.auth_id !== auth.authId) {
    return { error: "Only the host can change settings" };
  }
  return { roomId: room.id };
}

export async function updateRoomSettings(
  roomCode: string,
  dressCode: string,
  eventDate: string
): Promise<ActionState> {
  const host = await resolveHost(roomCode);
  if ("error" in host) return host;

  const parsed = eventDate ? new Date(eventDate) : null;
  if (parsed && Number.isNaN(parsed.getTime())) return { error: "Invalid date" };

  const { error } = await supabase.from("vibe_check").upsert({
    room_id: host.roomId,
    dress_code: dressCode.trim() || null,
    event_date: parsed?.toISOString() ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save settings" };

  revalidatePath(`/room/${roomCode.toUpperCase()}`);
  return null;
}

export async function archiveRoom(roomCode: string): Promise<ActionState> {
  const host = await resolveHost(roomCode);
  if ("error" in host) return host;

  const { error } = await supabase
    .from("rooms")
    .update({ is_active: false })
    .eq("id", host.roomId);
  if (error) return { error: "Could not archive room" };

  revalidatePath(`/room/${roomCode.toUpperCase()}`);
  redirect("/");
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
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };

  const { data: suggestion } = await supabase
    .from("itinerary_suggestions")
    .select("upvotes_count, rooms(room_code, users(auth_id))")
    .eq("id", suggestionId)
    .single();
  const room = suggestion?.rooms as unknown as {
    room_code: string;
    users: { auth_id: string | null }[];
  } | null;
  if (!suggestion || !room) return { error: "Suggestion not found" };
  if (!room.users.some((u) => u.auth_id === auth.authId)) return { error: "You are not in this room" };

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

export type NightSummary = {
  roomCode: string;
  isActive: boolean;
  isHost: boolean;
  memberCount: number;
  createdAt: string;
};

// Every night the current user belongs to (and hasn't removed from their list), ongoing
// first then most-recent past.
export async function getMyNights(): Promise<NightSummary[]> {
  const auth = await getAuthUser();
  if (!auth) return [];

  const { data: memberships } = await supabase
    .from("users")
    .select("is_host, room_id, rooms!inner(room_code, is_active, created_at)")
    .eq("auth_id", auth.authId)
    .eq("hidden", false);
  if (!memberships?.length) return [];

  // One extra query for member counts (reliable; avoids embedded-count edge cases).
  const roomIds = memberships.map((m) => m.room_id);
  const { data: memberRows } = await supabase.from("users").select("room_id").in("room_id", roomIds);
  const counts = new Map<string, number>();
  for (const r of memberRows ?? []) counts.set(r.room_id, (counts.get(r.room_id) ?? 0) + 1);

  const nights = memberships.map((m) => {
    const room = m.rooms as unknown as {
      room_code: string;
      is_active: boolean;
      created_at: string;
    };
    return {
      roomCode: room.room_code,
      isActive: room.is_active,
      isHost: m.is_host,
      memberCount: counts.get(m.room_id) ?? 0,
      createdAt: room.created_at,
    };
  });

  return nights.sort((a, b) =>
    a.isActive === b.isActive ? b.createdAt.localeCompare(a.createdAt) : a.isActive ? -1 : 1
  );
}

const MEDIA_BUCKET = "nightout-media";

// Once nobody has a night in their list anymore, it's abandoned — free its storage and DB.
// Deleting the room cascades to users/expenses/media/etc; the storage files (not in the DB
// cascade) are removed separately first.
// ponytail: best-effort + racy under simultaneous deletes; fine for cleanup, not correctness.
async function purgeRoomIfOrphaned(roomId: string, roomCode: string): Promise<void> {
  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("hidden", false);
  if ((count ?? 0) > 0) return; // still on someone's list — keep everything

  const folder = roomCode.toUpperCase();
  const { data: files } = await supabase.storage.from(MEDIA_BUCKET).list(folder);
  if (files?.length) {
    await supabase.storage.from(MEDIA_BUCKET).remove(files.map((f) => `${folder}/${f.name}`));
  }

  await supabase.from("rooms").delete().eq("id", roomId);
}

// Remove a night from the caller's own list (does not touch shared data — see 0007), then
// purge the whole night if that was the last person holding it.
export async function hideNight(roomCode: string): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .single();
  if (!room) return { error: "Night not found" };

  const { error } = await supabase
    .from("users")
    .update({ hidden: true })
    .eq("auth_id", auth.authId)
    .eq("room_id", room.id);
  if (error) return { error: "Could not remove night" };

  await purgeRoomIfOrphaned(room.id, roomCode);

  revalidatePath("/nights");
  return null;
}

export async function getMyProfile(): Promise<{ nickname: string | null; defaultName: string }> {
  const auth = await getAuthUser();
  if (!auth) return { nickname: null, defaultName: "" };
  const { data } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", auth.authId)
    .maybeSingle();
  return { nickname: data?.nickname ?? null, defaultName: auth.name };
}

export async function updateNickname(nickname: string): Promise<ActionState> {
  const auth = await getAuthUser();
  if (!auth) return { error: "Sign in with Google first" };
  const trimmed = nickname.trim();
  if (trimmed.length > 40) return { error: "Nickname must be 40 characters or fewer" };

  const { error } = await supabase.from("profiles").upsert({
    id: auth.authId,
    nickname: trimmed || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save nickname" };

  revalidatePath("/settings");
  return null;
}

// Per-night override: rename yourself within a single night (this night's membership only).
export async function updateMyNightName(roomCode: string, name: string): Promise<ActionState> {
  const member = await resolveMember(roomCode);
  if ("error" in member) return member;

  const trimmed = name.trim();
  if (!trimmed) return { error: "Name is required" };
  if (trimmed.length > 40) return { error: "Name must be 40 characters or fewer" };

  const { error } = await supabase
    .from("users")
    .update({ display_name: trimmed })
    .eq("id", member.userId);
  if (error) return { error: "Could not update name" };

  revalidatePath(`/room/${roomCode.toUpperCase()}`);
  return null;
}

import { supabase } from "./supabase";
import { getStoredIdentity } from "./device";
import { MAX_PARTICIPANTS } from "./callLimits";
import type { CallType } from "@/features/calls/CallContext";

export type CallRoom = {
  id: string;
  host_id: string;
  space_id: string | null;
  type: CallType;
  title: string | null;
  max_participants: number;
  status: "open" | "closed";
  created_at: string;
  ended_at: string | null;
};

export type CallParticipant = {
  id: string;
  room_id: string;
  user_id: string;
  device_id: string;
  joined_at: string;
  left_at: string | null;
  is_muted: boolean;
  is_video_off: boolean;
};

export async function createCallRoom(params: {
  userId: string;
  spaceId: string | null;
  type: CallType;
  title?: string;
}): Promise<CallRoom> {
  const max = MAX_PARTICIPANTS[params.type];

  const { data, error } = await supabase
    .from("ovbridge_call_rooms")
    .insert({
      host_id: params.userId,
      space_id: params.spaceId,
      type: params.type,
      title: params.title ?? null,
      max_participants: max,
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw error;

  const me = getStoredIdentity();
  if (me) {
    await supabase.from("ovbridge_call_participants").insert({
      room_id: data.id,
      user_id: params.userId,
      device_id: me.deviceId,
    });
  }

  return data as CallRoom;
}

export async function getActiveRoom(spaceId: string): Promise<CallRoom | null> {
  const { data, error } = await supabase
    .from("ovbridge_call_rooms")
    .select("*")
    .eq("space_id", spaceId)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as CallRoom) ?? null;
}

export async function getActiveParticipants(
  roomId: string
): Promise<CallParticipant[]> {
  const { data, error } = await supabase
    .from("ovbridge_call_participants")
    .select("*")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CallParticipant[];
}

export async function joinCallRoom(roomId: string, userId: string) {
  const me = getStoredIdentity();
  if (!me) throw new Error("Appareil non enregistré");

  const { count } = await supabase
    .from("ovbridge_call_participants")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .is("left_at", null);

  const { data: room } = await supabase
    .from("ovbridge_call_rooms")
    .select("max_participants")
    .eq("id", roomId)
    .single();

  if (room && (count ?? 0) >= room.max_participants) {
    throw new Error("Salle complète");
  }

  const { error } = await supabase
    .from("ovbridge_call_participants")
    .upsert(
      {
        room_id: roomId,
        user_id: userId,
        device_id: me.deviceId,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      { onConflict: "room_id,device_id" }
    );
  if (error) throw error;
}

export async function leaveCallRoom(roomId: string) {
  const me = getStoredIdentity();
  if (!me) return;

  await supabase
    .from("ovbridge_call_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("device_id", me.deviceId);
}

export async function endCallRoom(roomId: string) {
  await supabase
    .from("ovbridge_call_rooms")
    .update({ status: "closed", ended_at: new Date().toISOString() })
    .eq("id", roomId);
}
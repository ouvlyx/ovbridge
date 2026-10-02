import { supabase } from "./supabase";

export type Space = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type SpaceMember = {
  id: string;
  space_id: string;
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
};

export type SpaceInvite = {
  id: string;
  space_id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const s = Array.from(bytes).map((b) => CHARS[b % CHARS.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export async function createSpace(
  ownerId: string,
  name: string,
  description?: string
): Promise<Space> {
  const { data, error } = await supabase
    .from("ovbridge_spaces")
    .insert({
      owner_id: ownerId,
      name: name.trim(),
      description: description?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Space;
}

export async function inviteToSpace(
  spaceId: string,
  userId: string
): Promise<SpaceInvite> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("ovbridge_space_invites")
    .insert({
      space_id: spaceId,
      created_by: userId,
      code,
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SpaceInvite;
}

export async function joinSpaceByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("ovbridge_join_space_by_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  return data as string;
}

export async function removeMember(memberId: string) {
  const { error } = await supabase
    .from("ovbridge_space_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

export async function updateMemberRole(
  memberId: string,
  role: "admin" | "member"
) {
  const { error } = await supabase
    .from("ovbridge_space_members")
    .update({ role })
    .eq("id", memberId);
  if (error) throw error;
}

export async function deleteSpace(spaceId: string) {
  const { error } = await supabase
    .from("ovbridge_spaces")
    .delete()
    .eq("id", spaceId);
  if (error) throw error;
}

/**
 * Renvoie tous les devices actifs de tous les membres d'un espace
 * (sauf ceux de l'utilisateur courant).
 */

export async function getSpaceTargetDevices(
  spaceId: string,
  excludeUserId: string
) {
  // 1. Récupère les user_ids des membres (uniques)
  const { data: members, error: mErr } = await supabase
    .from("ovbridge_space_members")
    .select("user_id")
    .eq("space_id", spaceId);
  if (mErr) throw mErr;

  const userIds = Array.from(
    new Set(
      (members ?? [])
        .map((m: any) => m.user_id as string)
        .filter((id) => id !== excludeUserId)
    )
  );

  if (userIds.length === 0) return [];

  // 2. Récupère leurs devices actifs
  const { data: devices, error: dErr } = await supabase
    .from("ovbridge_devices")
    .select("id, name, public_key, user_id")
    .in("user_id", userIds)
    .eq("revoked", false)
    .eq("approved", true);
  if (dErr) throw dErr;

  // 3. Dédoublonne par ID (au cas où)
  const seen = new Set<string>();
  const unique = (devices ?? []).filter((d: any) => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  return unique as {
    id: string;
    name: string;
    public_key: string;
    user_id: string;
  }[];
}

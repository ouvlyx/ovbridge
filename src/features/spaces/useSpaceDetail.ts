import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Space, SpaceMember } from "@/lib/spaces";

export type MemberWithProfile = SpaceMember & {
  email: string;
  display_name: string | null;
};

export function useSpaceDetail(spaceId: string | undefined) {
  const [space, setSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!spaceId) return;

    const { data: sp } = await supabase
      .from("ovbridge_spaces")
      .select("*")
      .eq("id", spaceId)
      .maybeSingle();
    setSpace((sp as Space) ?? null);

    const { data: mem } = await supabase
      .from("ovbridge_space_members")
      .select("*")
      .eq("space_id", spaceId)
      .order("joined_at", { ascending: true });

    const list = (mem ?? []) as SpaceMember[];

    if (list.length > 0) {
      const uids = list.map((m) => m.user_id);
      const { data: profs } = await supabase
        .from("ovbridge_profiles")
        .select("id, email, display_name")
        .in("id", uids);

      const map: Record<string, { email: string; display_name: string | null }> = {};
      profs?.forEach((p: any) => {
        map[p.id] = { email: p.email, display_name: p.display_name };
      });

      setMembers(
        list.map((m) => ({
          ...m,
          email: map[m.user_id]?.email ?? "—",
          display_name: map[m.user_id]?.display_name ?? null,
        }))
      );
    } else {
      setMembers([]);
    }
  }, [spaceId]);

  useEffect(() => {
    if (!spaceId) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    const ch = supabase
      .channel(`space_${spaceId}_rt`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovbridge_space_members",
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          if (active) refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovbridge_spaces",
          filter: `id=eq.${spaceId}`,
        },
        () => {
          if (active) refresh();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [spaceId, refresh]);

  return { space, members, loading, refresh };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SUPABASE_SCHEMA } from "@/lib/constants";
import { withMinDelay } from "@/lib/utils";
import { useAuth } from "@/features/auth";
import type { Space, SpaceMember } from "@/lib/spaces";

export type SpaceWithMembers = Space & {
  members: SpaceMember[];
  myRole: "admin" | "member";
};

export function useSpaces() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<SpaceWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;

    const { data: spacesData, error } = await withMinDelay(
      Promise.resolve(
        supabase
          .from("ovbridge_spaces")
          .select("*")
          .order("created_at", { ascending: true })
      ),
      2000
    );
    if (error) {
      console.error("[useSpaces]", error);
      return;
    }

    const list = (spacesData ?? []) as Space[];
    if (list.length === 0) {
      setSpaces([]);
      return;
    }

    const ids = list.map((s) => s.id);
    const { data: membersData } = await supabase
      .from("ovbridge_space_members")
      .select("*")
      .in("space_id", ids);

    const members = (membersData ?? []) as SpaceMember[];

    setSpaces(
      list.map((s) => {
        const mem = members.filter((m) => m.space_id === s.id);
        const me = mem.find((m) => m.user_id === user.id);
        return {
          ...s,
          members: mem,
          myRole: me?.role ?? "member",
        };
      })
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    const ch = supabase
      .channel("ovbridge_spaces_rt")
      .on(
        "postgres_changes",
        { event: "*", schema: SUPABASE_SCHEMA, table: "ovbridge_spaces" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: SUPABASE_SCHEMA, table: "ovbridge_space_members" },
        () => refresh()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return { spaces, loading, refresh };
}

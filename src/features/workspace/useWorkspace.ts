import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/AuthProvider";

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  quota_bytes: number;
  used_bytes: number;
  created_at: string;
};

export function useWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("ovbridge_workspaces")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error) {
      console.error("[useWorkspace]", error);
      return;
    }
    setWorkspace((data as Workspace) ?? null);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    const ch = supabase
      .channel("workspace_rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ovbridge_workspaces",
          filter: `owner_id=eq.${user.id}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  return { workspace, loading, refresh };
}
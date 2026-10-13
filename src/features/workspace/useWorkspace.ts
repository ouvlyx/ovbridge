import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/useAuth";
import { SUPABASE_SCHEMA } from "@/lib/constants";
import { withMinDelay } from "@/lib/utils";
import { ensureWorkspace, type Workspace } from "@/lib/workspace";

export type { Workspace };

export function useWorkspace() {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const ws = await withMinDelay(ensureWorkspace(user.id), 2000);
      setWorkspace(ws);
    } catch (error) {
      console.error("[useWorkspace] Erreur lors de l'accès au workspace:", error);
    }
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
          schema: SUPABASE_SCHEMA,
          table: "ovbridge_workspaces",
          filter: `owner_id=eq.${user.id}`,
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
  }, [user, refresh]);

  return { workspace, loading, refresh };
}

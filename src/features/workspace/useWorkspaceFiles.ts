import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SUPABASE_SCHEMA } from "@/lib/constants";
import { withMinDelay } from "@/lib/utils";
import type { WorkspaceFile } from "@/lib/workspace";

export function useWorkspaceFiles(workspaceId: string | undefined) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;

    if (fetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    fetchingRef.current = true;
    try {
      const { data, error } = await withMinDelay(
        Promise.resolve(
          supabase
            .from("ovbridge_workspace_files")
            .select("*")
            .eq("workspace_id", workspaceId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        ),
        2000
      );

      if (error) throw error;

      const seen = new Set<string>();
      const unique = ((data ?? []) as WorkspaceFile[]).filter((f) => {
        if (seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });

      setFiles(unique);
    } catch (e) {
      console.error("[useWorkspaceFiles]", e);
    } finally {
      fetchingRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        refresh();
      }
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;

    (async () => {
      await refresh();
      if (active) setLoading(false);
    })();

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => refresh(), 200);
    };

    const ch = supabase
      .channel(`workspace_files_${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: SUPABASE_SCHEMA,
          table: "ovbridge_workspace_files",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => debouncedRefresh()
      )
      .subscribe();

    return () => {
      active = false;
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(ch);
    };
  }, [workspaceId, refresh]);

  return { files, loading, refresh };
}

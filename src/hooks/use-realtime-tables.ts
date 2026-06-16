import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to postgres_changes on one or more public tables and invalidate
 * the given React Query keys whenever a row changes. Tears down on unmount.
 */
export function useRealtimeTables(tables: string[], queryKeys: readonly unknown[][]) {
  const qc = useQueryClient();
  // stable string deps so effect doesn't re-fire each render
  const tablesKey = tables.join(",");
  const keysKey = queryKeys.map((k) => k.map(String).join(":")).join("|");

  useEffect(() => {
    const channel = supabase.channel(`rt:${tablesKey}:${Math.random().toString(36).slice(2, 8)}`);
    for (const t of tables) {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: t },
        () => {
          for (const k of queryKeys) qc.invalidateQueries({ queryKey: k });
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesKey, keysKey]);
}

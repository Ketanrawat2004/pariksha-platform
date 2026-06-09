import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useEditActivity(sessionId: string | null | undefined) {
  const chRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase.channel(`paper-edit-activity:${sessionId}`, { config: { broadcast: { self: false } } });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      chRef.current = null;
    };
  }, [sessionId]);

  return {
    emit(action: string, questionIndex?: number) {
      const ch = chRef.current;
      if (!ch) return;
      void ch.send({ type: "broadcast", event: "activity", payload: { action, questionIndex } });
    },
  };
}

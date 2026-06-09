import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { StaffWatchDrawer } from "./staff-watch-drawer";
import type { WatchSessionRow } from "@/lib/trishield/use-trishield-watch";

/**
 * Listens for active TriShield sessions and shows a persistent red banner
 * until the staff party joins. Renders the drawer when "Join" is clicked.
 */
export function StaffWatchBanner({ party }: { party: "admin" | "superadmin" }) {
  const [pending, setPending] = useState<WatchSessionRow[]>([]);
  const [openSession, setOpenSession] = useState<WatchSessionRow | null>(null);

  // Initial load of active sessions not yet joined by this party
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("trishield_watch_sessions" as any)
        .select("*")
        .eq("status", "active")
        .order("session_started_at", { ascending: false });
      if (cancelled || !data) return;
      const filtered = (data as any[]).filter((s) =>
        party === "admin" ? !s.admin_camera_active : !s.superadmin_camera_active,
      );
      setPending(filtered as WatchSessionRow[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [party]);

  // Realtime: new inserts + updates (so banner disappears when join completes)
  useEffect(() => {
    const ch = supabase
      .channel(`staff-watch-banner-${party}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trishield_watch_sessions" },
        (payload) => {
          const row = payload.new as any as WatchSessionRow;
          if (row.status !== "active") return;
          const cameraActive = party === "admin" ? row.admin_camera_active : row.superadmin_camera_active;
          if (cameraActive) return;
          setPending((p) => (p.some((r) => r.id === row.id) ? p : [row, ...p]));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trishield_watch_sessions" },
        (payload) => {
          const row = payload.new as any as WatchSessionRow;
          const cameraActive = party === "admin" ? row.admin_camera_active : row.superadmin_camera_active;
          if (cameraActive || row.status !== "active") {
            setPending((p) => p.filter((r) => r.id !== row.id));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [party]);

  const top = pending[0];

  return (
    <>
      {top && (
        <div className="-mx-4 sm:-mx-6 mb-4 bg-destructive text-destructive-foreground px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 shadow-lg">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <div className="text-sm flex-1">
            <strong>TriShield LiveWatch Session Started</strong> — Institute is working on an exam paper. Your camera presence is required.
          </div>
          <Button size="sm" variant="secondary" onClick={() => setOpenSession(top)}>
            Join LiveWatch
          </Button>
        </div>
      )}
      {openSession && (
        <StaffWatchDrawer
          party={party}
          sessionId={openSession.id}
          onClose={() => setOpenSession(null)}
        />
      )}
    </>
  );
}

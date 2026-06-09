import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTriShieldWatch } from "@/lib/trishield/use-trishield-watch";
import { useLockCeremonyWitness } from "@/lib/trishield/use-lock-ceremony";
import { CameraRequiredBlock } from "./camera-required-block";
import { TriShieldWatchBar } from "./trishield-watch-bar";
import { ShieldOff, X, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ActivityEvent {
  ts: number;
  questionIndex?: number;
  action: string;
}

export function StaffWatchDrawer({ party, sessionId, onClose }: { party: "admin" | "superadmin"; sessionId: string; onClose: () => void }) {
  const { denied, granted, session, videoRef, canvasRef, requestCamera } = useTriShieldWatch({
    party,
    enabled: true,
    existingSessionId: sessionId,
  });
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [halting, setHalting] = useState(false);

  // Superadmin: subscribe to paper-edit activity broadcast
  useEffect(() => {
    if (party !== "superadmin") return;
    const ch = supabase
      .channel(`paper-edit-activity:${sessionId}`)
      .on("broadcast", { event: "activity" }, ({ payload }) => {
        setActivity((a) => [{ ts: Date.now(), ...(payload as any) }, ...a].slice(0, 50));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [party, sessionId]);

  async function haltSession() {
    if (!confirm("Halt this TriShield session? Unsaved edits will be lost.")) return;
    setHalting(true);
    try {
      const { error } = await supabase
        .from("trishield_watch_sessions" as any)
        .update({ status: "halted", session_ended_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
      await supabase.from("audit_log" as any).insert({
        action: "SUPERADMIN_HALT",
        resource: "trishield_watch_session",
        resource_id: sessionId,
        details: { dual_shield_event: true } as any,
      } as any);
      toast.success("Session halted");
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Halt failed");
    } finally {
      setHalting(false);
    }
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[360px] sm:max-w-[360px] p-0 overflow-y-auto">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="flex items-center justify-between">
            <span className="capitalize">{party} LiveWatch</span>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </SheetTitle>
        </SheetHeader>

        {denied && (
          <div className="p-4">
            <CameraRequiredBlock scope="inline" onRetry={requestCamera} />
          </div>
        )}

        {granted && (
          <div className="p-4 space-y-4">
            <TriShieldWatchBar session={session} sticky={false} />

            <Panel label="Your feed">
              <video ref={videoRef} className="w-full aspect-video object-cover bg-slate-900" muted playsInline />
              <canvas ref={canvasRef} className="hidden" />
            </Panel>

            <Panel label="Institute">
              <PlaceholderFeed
                active={!!session?.institute_camera_active}
                count={session?.institute_snapshot_count ?? 0}
              />
            </Panel>

            <Panel label={party === "admin" ? "SuperAdmin" : "Admin"}>
              <PlaceholderFeed
                active={party === "admin" ? !!session?.superadmin_camera_active : !!session?.admin_camera_active}
                count={party === "admin" ? (session?.superadmin_snapshot_count ?? 0) : (session?.admin_snapshot_count ?? 0)}
              />
            </Panel>

            {party === "superadmin" && (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Live activity</h4>
                  <div className="rounded-md border border-border bg-muted/30 max-h-48 overflow-y-auto">
                    {activity.length === 0 ? (
                      <div className="p-3 text-xs text-muted-foreground">Waiting for edit activity…</div>
                    ) : (
                      activity.map((e, i) => (
                        <div key={i} className="px-3 py-1.5 text-xs border-b border-border/40 last:border-0 flex justify-between">
                          <span>
                            {e.questionIndex != null && <span className="font-mono text-muted-foreground">Q{e.questionIndex + 1} </span>}
                            <span className="font-medium">{e.action}</span>
                          </span>
                          <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <Button variant="destructive" className="w-full" onClick={haltSession} disabled={halting}>
                  <ShieldOff className="h-4 w-4 mr-1.5" /> Halt session
                </Button>
              </>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-1.5">{label}</h4>
      <div className="rounded-md overflow-hidden border border-border">{children}</div>
    </div>
  );
}

function PlaceholderFeed({ active, count }: { active: boolean; count: number }) {
  return (
    <div className={`p-4 text-center text-xs ${active ? "bg-success/10 text-foreground" : "bg-muted/40 text-muted-foreground"}`}>
      {active ? "Camera active — feed monitored via snapshots" : "Not yet joined"}
      <div className="mt-1 font-mono text-[10px]">{count} snapshots</div>
    </div>
  );
}

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, KeyRound } from "lucide-react";
import { StaffWatchDrawer } from "./staff-watch-drawer";
import { toast } from "sonner";

/**
 * Staff (admin/superadmin) join an institute's TriShield session by entering
 * the 6-character code shown on the institute's dashboard. This guarantees
 * each staff member connects to the exact session — no random pairing.
 */
export function StaffWatchBanner({ party }: { party: "admin" | "superadmin" }) {
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  async function joinByCode() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) { toast.error("Enter the 6-character code shown on the institute dashboard"); return; }
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("find_trishield_session_by_code" as any, { _code: trimmed } as any);
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) { toast.error("No active session found for that code"); return; }
      setOpenSessionId(row.id);
      toast.success("Joining institute's LiveWatch…");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not join session");
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <div className="-mx-4 sm:-mx-6 mb-4 bg-destructive/10 border-y border-destructive/30 px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
        <div className="text-sm flex-1 min-w-[200px]">
          <strong>TriShield LiveWatch</strong> — Enter the join code from the institute to monitor their paper session in real time.
        </div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="ABC123"
            className="w-32 font-mono uppercase tracking-widest"
            onKeyDown={(e) => { if (e.key === "Enter") void joinByCode(); }}
          />
          <Button size="sm" onClick={joinByCode} disabled={joining || code.length < 4}>
            {joining ? "Joining…" : "Join LiveWatch"}
          </Button>
        </div>
      </div>
      {openSessionId && (
        <StaffWatchDrawer
          party={party}
          sessionId={openSessionId}
          onClose={() => setOpenSessionId(null)}
        />
      )}
    </>
  );
}

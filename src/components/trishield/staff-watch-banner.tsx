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
    if (trimmed.length < 4) {
      toast.error("Enter the 6-character code shown on the institute dashboard");
      return;
    }
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc("find_trishield_session_by_code", {
        _code: trimmed,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id) {
        toast.error("No active session found for that code");
        return;
      }
      setOpenSessionId(row.id);
      toast.success("Joining institute's LiveWatch…");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not join session");
    } finally {
      setJoining(false);
    }
  }

  return (
    <>
      <div className="-mx-4 mb-4 grid grid-cols-[minmax(0,1fr)] items-center gap-3 border-y border-destructive/30 bg-destructive/10 px-4 py-3 sm:-mx-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:px-6">
        <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 text-sm">
          <strong>TriShield LiveWatch</strong> — Enter the join code from the institute to
          monitor their paper session in real time.
        </div>
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 sm:flex sm:shrink-0">
          <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 6),
              )
            }
            placeholder="ABC123"
            className="w-full font-mono uppercase tracking-widest sm:w-32"
            onKeyDown={(e) => {
              if (e.key === "Enter") void joinByCode();
            }}
          />
          <Button
            size="sm"
            onClick={joinByCode}
            disabled={joining || code.length < 4}
            className="col-span-2 w-full sm:w-auto"
          >
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

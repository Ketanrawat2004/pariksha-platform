import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { downloadActivityReport, fetchActivityRows } from "@/lib/pdf/activity-report";
import { logActivity } from "@/lib/activity-log";
import { toast } from "sonner";

export function ActivityReportButton({ role, className }: { role: string; className?: string }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!user) return;
    setBusy(true);
    try {
      const [{ data: profile }, rows] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        fetchActivityRows(user.id, 500),
      ]);
      downloadActivityReport({
        userName: profile?.full_name ?? user.email ?? "User",
        userEmail: user.email ?? "",
        role,
        rows,
      });
      void logActivity("activity_report_download", { rows: rows.length });
      toast.success("Activity report downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not generate report");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy} className={className}>
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      Download activity report (PDF)
    </Button>
  );
}

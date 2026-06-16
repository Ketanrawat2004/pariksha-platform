import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/use-realtime-tables";
import { ClipboardCheck, Search, CheckCircle2, Clock } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/invigilator/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["invigilator", "admin", "superadmin"]}>
      <AttendancePage />
    </ProtectedShell>
  ),
});

function AttendancePage() {
  const [q, setQ] = useState("");
  useRealtimeTables(["registrations"], [["invig-attendance"]]);
  const { data, isLoading } = useQuery({
    queryKey: ["invig-attendance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("id,admit_card_number,status,seat_number,candidate:profiles!registrations_candidate_id_fkey(full_name,email),exam:exams(title,exam_date,start_time)")
        .order("registered_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter((r) => {
      if (!q) return true;
      const t = q.toLowerCase();
      const c = (r as { candidate: { full_name?: string; email?: string } | null }).candidate;
      return `${r.admit_card_number} ${c?.full_name ?? ""} ${c?.email ?? ""}`.toLowerCase().includes(t);
    }),
    [data, q],
  );

  const present = (data ?? []).filter((r) => r.status === "approved").length;

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <ClipboardCheck className="h-7 w-7 shrink-0 text-accent" /> <span className="truncate">Attendance</span>
          </h1>
          <p className="text-muted-foreground mt-1">{(data ?? []).length} registered · {present} present</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search admit-card / name" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No registrations.</p>
          </Card>
        ) : (
          filtered.map((r) => {
            const cand = (r as { candidate: { full_name?: string; email?: string } | null }).candidate;
            const ex = (r as { exam: { title?: string; exam_date?: string; start_time?: string } | null }).exam;
            const isPresent = r.status === "approved";
            return (
              <Card key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-3 sm:flex sm:flex-wrap">
                {isPresent ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0 sm:flex-1">
                  <div className="truncate font-semibold leading-tight">{cand?.full_name ?? "Candidate"}</div>
                  <div className="truncate text-xs text-muted-foreground">{cand?.email}</div>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">{r.admit_card_number}</Badge>
                {r.seat_number && <Badge variant="secondary" className="text-[10px]">Seat {r.seat_number}</Badge>}
                <div className="min-w-0 truncate text-xs text-muted-foreground sm:min-w-[140px]">{ex?.title} · {ex?.exam_date}</div>
                <Badge variant={isPresent ? "default" : "outline"} className="text-[10px] uppercase">{r.status}</Badge>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}

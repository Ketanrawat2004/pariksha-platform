import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeTables } from "@/hooks/use-realtime-tables";
import { Grid3x3, Building2 } from "lucide-react";

export const Route = createFileRoute("/invigilator/seating")({
  head: () => ({ meta: [{ title: "Seating — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["invigilator", "admin", "superadmin"]}>
      <SeatingPage />
    </ProtectedShell>
  ),
});

function SeatingPage() {
  useRealtimeTables(["registrations", "centers"], [["invig-seating"]]);
  const { data, isLoading } = useQuery({
    queryKey: ["invig-seating"],
    queryFn: async () => {
      const [centers, regs] = await Promise.all([
        supabase.from("centers").select("id,name,district,state,capacity"),
        supabase.from("registrations").select("id,center_id,seat_number,admit_card_number,candidate:profiles!registrations_candidate_id_fkey(full_name)").not("center_id", "is", null).limit(500),
      ]);
      if (centers.error) throw centers.error;
      if (regs.error) throw regs.error;
      return { centers: centers.data ?? [], regs: regs.data ?? [] };
    },
  });

  const byCenter = new Map<string, typeof data extends { regs: infer R } ? R : never>();
  for (const r of data?.regs ?? []) {
    const k = r.center_id as string;
    const list = (byCenter.get(k) as unknown as Array<typeof r>) ?? [];
    list.push(r);
    byCenter.set(k, list as never);
  }

  return (
    <>
      <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <Grid3x3 className="h-7 w-7 shrink-0 text-accent" /> <span className="truncate">Seating Plan</span>
      </h1>
      <p className="text-muted-foreground mt-1 mb-6">Seat allocations grouped by exam center.</p>

      <div className="space-y-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)
        ) : (data?.centers ?? []).length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No centers configured.</p>
          </Card>
        ) : (
          data!.centers.map((c) => {
            const list = (byCenter.get(c.id) as unknown as Array<{ id: string; seat_number: string | null; admit_card_number: string; candidate: { full_name?: string } | null }>) ?? [];
            return (
              <Card key={c.id} className="p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 mb-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2 font-semibold"><Building2 className="h-4 w-4 shrink-0 text-accent" /><span className="truncate">{c.name}</span></div>
                    <div className="text-xs text-muted-foreground">{c.district}, {c.state}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{list.length} / {c.capacity} seats</Badge>
                </div>
                {list.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-3">No seat assignments yet.</div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {list.slice(0, 60).map((r) => (
                      <div key={r.id} className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                        <span className="w-12 shrink-0 font-mono font-bold text-accent">{r.seat_number ?? "—"}</span>
                        <span className="flex-1 truncate">{r.candidate?.full_name ?? r.admit_card_number}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}

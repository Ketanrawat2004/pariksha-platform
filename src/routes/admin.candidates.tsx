import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Users, Search, Mail, Phone } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin/candidates")({
  head: () => ({ meta: [{ title: "Candidates — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <CandidatesPage />
    </ProtectedShell>
  ),
});

function CandidatesPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-candidates"],
    queryFn: async () => {
      // Candidates = users with the 'candidate' role
      const { data: roleRows, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "candidate")
        .limit(500);
      if (rErr) throw rErr;
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id,full_name,email,phone,state,is_active,created_at")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter((c) => !q || `${c.full_name} ${c.email} ${c.phone ?? ""} ${c.state ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-accent" /> Candidates
          </h1>
          <p className="text-muted-foreground mt-1">{(data ?? []).length} registered candidates.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name / email / state" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No candidates found.</p>
          </Card>
        ) : (
          filtered.map((c) => (
            <Card key={c.id} className="p-3 flex flex-wrap items-center gap-4 hover:bg-muted/30">
              <div className="flex-1 min-w-[200px]">
                <div className="font-semibold">{c.full_name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                  {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                </div>
              </div>
              {c.state && <Badge variant="outline" className="text-xs">{c.state}</Badge>}
              <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px] uppercase">
                {c.is_active ? "Active" : "Inactive"}
              </Badge>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

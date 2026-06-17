import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Shield as ShieldUser, Search, Crown, Shield, Eye } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/superadmin/admins")({
  head: () => ({ meta: [{ title: "Admins — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <AdminsPage />
    </ProtectedShell>
  ),
});

const ROLE_META: Record<string, { icon: React.ReactNode; tone: "default" | "secondary" | "outline" }> = {
  superadmin: { icon: <Crown className="h-3 w-3 mr-1" />, tone: "default" },
  admin: { icon: <Shield className="h-3 w-3 mr-1" />, tone: "default" },
  invigilator: { icon: <Eye className="h-3 w-3 mr-1" />, tone: "secondary" },
  institute: { icon: <Shield className="h-3 w-3 mr-1" />, tone: "secondary" },
};

function AdminsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["sa-admins"],
    queryFn: async () => {
      const { data: roleRows, error } = await supabase
        .from("user_roles")
        .select("user_id,role,created_at")
        .in("role", ["superadmin", "admin", "invigilator", "institute"]);
      if (error) throw error;
      const ids = Array.from(new Set((roleRows ?? []).map((r) => r.user_id)));
      if (!ids.length) return [];
      const { data: profs, error: pErr } = await supabase.from("profiles").select("id,full_name,email,phone,is_active").in("id", ids);
      if (pErr) throw pErr;
      const profMap = new Map((profs ?? []).map((p) => [p.id, p]));
      const grouped = new Map<string, { id: string; full_name: string; email: string; phone: string | null; is_active: boolean; roles: string[] }>();
      for (const r of roleRows ?? []) {
        const p = profMap.get(r.user_id);
        if (!p) continue;
        const cur = grouped.get(p.id) ?? { ...p, roles: [] };
        cur.roles.push(r.role);
        grouped.set(p.id, cur);
      }
      return Array.from(grouped.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter((u) => !q || `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <ShieldUser className="h-7 w-7 shrink-0 text-accent" /> <span className="truncate">Staff & Admins</span>
          </h1>
          <p className="text-muted-foreground mt-1">{(data ?? []).length} staff accounts across all elevated roles.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name / email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ShieldUser className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No staff accounts.</p>
          </Card>
        ) : (
          filtered.map((u) => (
            <Card key={u.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 sm:flex sm:flex-wrap">
              <div className="min-w-0 sm:flex-1 sm:min-w-[200px]">
                <div className="truncate font-semibold leading-tight">{u.full_name}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {u.roles.map((r) => {
                  const m = ROLE_META[r] ?? { icon: null, tone: "outline" as const };
                  return (
                    <Badge key={r} variant={m.tone} className="text-[10px] uppercase">
                      {m.icon}{r}
                    </Badge>
                  );
                })}
              </div>
              <Badge variant={u.is_active ? "default" : "secondary"} className="text-[10px] uppercase">{u.is_active ? "Active" : "Inactive"}</Badge>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

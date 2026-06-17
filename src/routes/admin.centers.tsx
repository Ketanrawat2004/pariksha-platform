import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Users, ShieldCheck, ShieldAlert, Search } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin/centers")({
  head: () => ({ meta: [{ title: "Centers — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <CentersPage />
    </ProtectedShell>
  ),
});

function CentersPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centers")
        .select("id,name,district,state,pincode,capacity,is_verified,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter((c) => !q || `${c.name} ${c.district} ${c.state} ${c.pincode}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      verified: list.filter((c) => c.is_verified).length,
      capacity: list.reduce((a, c) => a + (c.capacity ?? 0), 0),
    };
  }, [data]);

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-accent" /> Exam Centers
          </h1>
          <p className="text-muted-foreground mt-1">{stats.total} centers · {stats.verified} verified · {stats.capacity.toLocaleString()} total seats</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name / district / pincode" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed col-span-full">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No centers found.</p>
          </Card>
        ) : (
          filtered.map((c) => (
            <Card key={c.id} className="p-4 hover:shadow-elegant transition">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold leading-tight">{c.name}</div>
                <Badge variant={c.is_verified ? "default" : "outline"} className="text-[10px] shrink-0">
                  {c.is_verified ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
                  {c.is_verified ? "VERIFIED" : "PENDING"}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {c.district}, {c.state} · {c.pincode}
              </div>
              <div className="mt-2 text-xs flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" /> Capacity <span className="font-semibold">{c.capacity}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

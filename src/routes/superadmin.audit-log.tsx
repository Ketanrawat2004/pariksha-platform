import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Search } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/superadmin/audit-log")({
  head: () => ({ meta: [{ title: "Audit Log — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["superadmin"]}>
      <AuditPage />
    </ProtectedShell>
  ),
});

function AuditPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["sa-audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id,action,resource,resource_id,ip_address,timestamp,user_id,details")
        .order("timestamp", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter((e) => !q || `${e.action} ${e.resource ?? ""} ${e.resource_id ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-7 w-7 text-accent" /> Audit Log
          </h1>
          <p className="text-muted-foreground mt-1">Append-only record of every privileged action.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search action / resource" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <ScrollText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No audit entries.</p>
          </Card>
        ) : (
          filtered.map((e) => (
            <Card key={e.id} className="p-3 flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="outline" className="font-mono text-[10px]">{e.action}</Badge>
              {e.resource && <span className="text-xs text-muted-foreground">{e.resource}</span>}
              {e.resource_id && <code className="text-[10px] text-muted-foreground truncate max-w-[160px]">{e.resource_id}</code>}
              <div className="flex-1" />
              {e.ip_address && <span className="text-[10px] text-muted-foreground font-mono">{e.ip_address}</span>}
              <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

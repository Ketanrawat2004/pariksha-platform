import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, FileText, Search } from "lucide-react";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin/exams")({
  head: () => ({ meta: [{ title: "Exams — Pariksha" }] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <ExamsPage />
    </ProtectedShell>
  ),
});

function ExamsPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("id,title,subject,exam_date,start_time,duration_minutes,total_marks,passing_marks,status,paper_hash,created_at")
        .order("exam_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(
    () => (data ?? []).filter((e) => !q || `${e.title} ${e.subject}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <FileText className="h-7 w-7 shrink-0 text-accent" /> <span className="truncate">Exams</span>
          </h1>
          <p className="text-muted-foreground mt-1">All exams across the platform.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search title or subject" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No exams yet.</p>
          </Card>
        ) : (
          filtered.map((e) => (
            <Card key={e.id} className="grid grid-cols-[minmax(0,1fr)] items-center gap-3 p-4 hover:bg-muted/30 sm:flex sm:flex-wrap sm:gap-4">
              <div className="min-w-0 sm:flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="min-w-0 truncate font-semibold">{e.title}</span>
                  <Badge variant="outline" className="text-xs">{e.subject}</Badge>
                  <Badge
                    variant={e.status === "live" || e.status === "scheduled" ? "default" : e.status === "completed" ? "secondary" : "outline"}
                    className="text-xs uppercase"
                  >
                    {e.status}
                  </Badge>
                </div>
                {e.paper_hash && (
                  <div className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                    sha256:{e.paper_hash.slice(0, 16)}…
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> {e.exam_date}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {e.start_time?.slice(0, 5)} · {e.duration_minutes}m
              </div>
              <div className="text-xs">
                <span className="font-semibold">{e.total_marks}</span>
                <span className="text-muted-foreground"> marks · pass {e.passing_marks}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

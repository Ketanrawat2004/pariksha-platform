import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listIncidentsAdmin,
  createIncident,
  updateIncident,
  deleteIncident,
} from "@/lib/status/incidents.functions";

export const Route = createFileRoute("/admin/incidents")({
  head: () => ({
    meta: [
      { title: "Incidents · Admin — Pariksha" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <IncidentsAdmin />
    </ProtectedShell>
  ),
});

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  severity: z.enum(["minor", "major", "critical"]),
  status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
  summary: z.string().trim().max(4000).default(""),
});
type FormData = z.infer<typeof schema>;

type Incident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  summary: string;
  started_at: string;
  resolved_at: string | null;
};

function IncidentsAdmin() {
  const qc = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ["admin-incidents"],
    queryFn: () => listIncidentsAdmin(),
  });

  const [creating, setCreating] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "minor", status: "investigating", summary: "" },
  });

  const onCreate = async (data: FormData) => {
    setCreating(true);
    try {
      await createIncident({ data });
      toast.success("Incident created");
      reset({ severity: "minor", status: "investigating", summary: "", title: "" });
      qc.invalidateQueries({ queryKey: ["admin-incidents"] });
      qc.invalidateQueries({ queryKey: ["status-metrics"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id: string, status: Incident["status"]) => {
    try {
      await updateIncident({ data: { id, status: status as any } });
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-incidents"] });
      qc.invalidateQueries({ queryKey: ["status-metrics"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this incident?")) return;
    try {
      await deleteIncident({ data: { id } });
      qc.invalidateQueries({ queryKey: ["admin-incidents"] });
      qc.invalidateQueries({ queryKey: ["status-metrics"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Incidents</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Anything you publish here appears on the public <code>/status</code> page in real time.
        </p>
      </div>

      <Card className="p-4 sm:p-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4" /> New incident
        </h2>
        <form onSubmit={handleSubmit(onCreate)} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} placeholder="Elevated latency on result PDFs" />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={watch("severity")} onValueChange={(v) => setValue("severity", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea id="summary" rows={3} {...register("summary")} placeholder="What happened, what changed, mitigation status." />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publish incident
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Recent incidents</h2>
        {isLoading ? (
          <Card className="p-6 text-sm text-muted-foreground">Loading…</Card>
        ) : incidents.length === 0 ? (
          <Card className="p-6 text-sm text-muted-foreground">No incidents yet.</Card>
        ) : (
          incidents.map((i: Incident) => (
            <Card key={i.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={i.severity === "minor" ? "secondary" : "destructive"}>
                  <AlertTriangle className="h-3 w-3 mr-1" /> {i.severity}
                </Badge>
                <Badge variant="outline" className="capitalize">{i.status}</Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {new Date(i.started_at).toLocaleString()}
                </span>
                {i.resolved_at && (
                  <Badge variant="outline" className="text-success border-success/40">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                  </Badge>
                )}
              </div>
              <h3 className="mt-2 font-semibold">{i.title}</h3>
              {i.summary && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{i.summary}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {(["investigating", "identified", "monitoring", "resolved"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={i.status === s ? "default" : "outline"}
                    onClick={() => setStatus(i.id, s)}
                  >
                    {s}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" onClick={() => remove(i.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

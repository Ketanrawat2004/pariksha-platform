import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Inbox, MailQuestion, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface EditReq {
  id: string;
  title: string;
  subject: string | null;
  exam_date: string | null;
  start_time: string | null;
  duration_minutes: number | null;
  total_marks: number | null;
  teacher_name: string | null;
  institute_id: string;
  edit_request_note: string | null;
  updated_at: string;
}

/**
 * Inbox of paper submissions whose status is `edit_requested`.
 * Visible on the admin and superadmin dashboards so requests from institutes
 * are actually surfaced (the request itself only flips the status — there was
 * no UI showing them before).
 */
export function EditRequestsInbox() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<EditReq | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["edit-request-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_submissions")
        .select("id,title,subject,exam_date,start_time,duration_minutes,total_marks,teacher_name,institute_id,edit_request_note,updated_at")
        .eq("status", "edit_requested")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EditReq[];
    },
    refetchInterval: 15_000,
  });

  async function decide(approve: boolean) {
    if (!selected) return;
    const nextStatus = approve ? "draft" : "locked";
    const { error } = await supabase
      .from("paper_submissions")
      .update({ status: nextStatus, edit_request_note: null })
      .eq("id", selected.id);
    if (error) { toast.error(error.message); return; }
    toast.success(approve ? "Edit approved — institute can now edit" : "Edit rejected — paper stays locked");
    setSelected(null);
    qc.invalidateQueries({ queryKey: ["edit-request-inbox"] });
  }

  return (
    <Card className="p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Inbox className="h-5 w-5 text-accent" /> Edit-request inbox
          {data?.length ? <Badge variant="destructive" className="ml-1">{data.length}</Badge> : null}
        </h2>
        <span className="text-xs text-muted-foreground">Refreshes every 15s</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : !data?.length ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-md">
          <MailQuestion className="h-6 w-6 mx-auto mb-1 opacity-60" />
          No pending edit requests.
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className="w-full text-left rounded-md border border-border hover:border-accent/50 hover:bg-accent/5 p-3 transition"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.title}</span>
                {r.subject && <Badge variant="outline">{r.subject}</Badge>}
                <Badge className="bg-destructive/15 text-destructive border-0">edit_requested</Badge>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.updated_at).toLocaleString()}
                </span>
              </div>
              {r.edit_request_note && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {r.edit_request_note}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Dialog open onOpenChange={(o) => { if (!o) setSelected(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit request — {selected.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                {selected.exam_date} · {selected.start_time?.slice(0, 5)} · {selected.duration_minutes} min · {selected.total_marks} marks
                {selected.teacher_name ? ` · ${selected.teacher_name}` : ""}
              </div>
              <div className="rounded-md border bg-muted/30 p-3 whitespace-pre-wrap text-sm">
                {selected.edit_request_note || "(no note provided)"}
              </div>
              {selected.edit_request_note?.includes("http") && (
                <a
                  href={(selected.edit_request_note.match(/https?:\/\/\S+/) ?? [])[0]}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open submitter photo
                </a>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => decide(false)}>
                <XCircle className="h-4 w-4 mr-1.5" /> Reject (keep locked)
              </Button>
              <Button onClick={() => decide(true)}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

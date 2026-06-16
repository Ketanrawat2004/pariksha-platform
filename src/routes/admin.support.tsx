import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Loader2, Send, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/support")({
  head: () => ({ meta: [{ title: "Support messages — Pariksha Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: () => (
    <ProtectedShell requireRoles={["admin", "superadmin"]}>
      <SupportInbox />
    </ProtectedShell>
  ),
});

type Ticket = {
  id: string;
  case_ref: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_by: string | null;
  created_at: string;
  reply_message: string | null;
  replied_at: string | null;
};

function SupportInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-support-tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (filter !== "all" && t.status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.case_ref.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, filter, search]);

  const selected = useMemo(() => filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null, [filtered, selectedId]);

  useEffect(() => {
    setReply(selected?.reply_message ?? "");
  }, [selected?.id]);

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    setSending(true);
    const { error } = await supabase
      .from("support_tickets")
      .update({ reply_message: reply.trim() })
      .eq("id", selected.id);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success(selected.created_by ? "Reply sent — candidate notified" : "Reply saved");
  };

  const setStatus = async (status: Ticket["status"]) => {
    if (!selected) return;
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", selected.id);
    if (error) toast.error(error.message);
  };

  const badgeFor = (s: Ticket["status"]) =>
    s === "open" ? "bg-warning/15 text-warning border-warning/30"
    : s === "in_progress" ? "bg-accent/15 text-accent border-accent/30"
    : s === "resolved" ? "bg-success/15 text-success border-success/30"
    : "bg-muted text-muted-foreground";

  return (
    <>
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)] items-center gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-3 min-w-0">
          <LifeBuoy className="h-7 w-7 text-accent shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Support messages</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Live inbox · replies appear in the candidate's notifications instantly</p>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-end">
          <div className="relative min-w-0">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-8 w-full pl-7 sm:w-48" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="p-0 overflow-hidden max-h-[70vh] flex flex-col">
          {loading ? (
            <div className="flex-1 grid place-items-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 grid place-items-center p-8 text-sm text-muted-foreground">No tickets match.</div>
          ) : (
            <div className="overflow-y-auto divide-y">
              {filtered.map((t) => {
                const active = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3 hover:bg-muted/40 transition ${active ? "bg-accent/5" : ""}`}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <div className="truncate font-mono text-[10px] text-muted-foreground">{t.case_ref}</div>
                      <Badge variant="outline" className={`text-[10px] ${badgeFor(t.status)}`}>{t.status}</Badge>
                    </div>
                    <div className="font-semibold text-sm mt-0.5 truncate">{t.subject}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.name} · {t.email}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          {!selected ? (
            <div className="text-sm text-muted-foreground">Select a ticket to view & reply.</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0 truncate font-mono text-xs text-muted-foreground">{selected.case_ref}</div>
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    <Button size="sm" variant="outline" onClick={() => setStatus("in_progress")}>In progress</Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus("resolved")}>Resolve</Button>
                  </div>
                </div>
                <h2 className="text-lg font-bold mt-1">{selected.subject}</h2>
                <div className="text-xs text-muted-foreground">{selected.name} · <a className="text-accent hover:underline" href={`mailto:${selected.email}`}>{selected.email}</a></div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{selected.message}</div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reply to candidate</label>
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={5} placeholder="Type your reply…" className="mt-1" />
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)] items-center gap-2 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_auto]">
                  <span className="min-w-0">
                    {selected.replied_at ? `Last reply ${new Date(selected.replied_at).toLocaleString()}` :
                     selected.created_by ? "Will appear in their notifications in real-time" :
                     "Anonymous ticket — reply will be saved but not delivered"}
                  </span>
                  <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()}>
                    {sending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                    Send reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityRow {
  id: string;
  action: string;
  resource: string | null;
  resource_id: string | null;
  ip_address: string | null;
  timestamp: string;
  details: Record<string, unknown> | null;
}

export interface ActivityReportInput {
  userName: string;
  userEmail: string;
  role: string;
  rows: ActivityRow[];
}

export async function fetchActivityRows(userId: string, limit = 500): Promise<ActivityRow[]> {
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, resource, resource_id, ip_address, timestamp, details")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityRow[];
}

export function downloadActivityReport(input: ActivityReportInput) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  let y = 18;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PARIKSHA — Activity Report", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22);

  // Identity
  doc.setTextColor(15, 23, 42);
  y = 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(input.userName, 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`${input.userEmail}  ·  Role: ${input.role}`, 14, y + 5);
  y += 12;

  // Table header
  doc.setDrawColor(220);
  doc.line(14, y, W - 14, y);
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Date & time", 14, y);
  doc.text("Action", 64, y);
  doc.text("Resource", 110, y);
  doc.text("Details", 150, y);
  y += 3;
  doc.line(14, y, W - 14, y);
  y += 4;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const r of input.rows) {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    const ts = new Date(r.timestamp);
    doc.setTextColor(40);
    doc.text(ts.toLocaleString(), 14, y);
    doc.setTextColor(15, 23, 42);
    doc.text(String(r.action).slice(0, 24), 64, y);
    doc.setTextColor(80);
    doc.text((r.resource ?? "—").slice(0, 22), 110, y);
    const detailStr = r.details ? JSON.stringify(r.details) : "";
    doc.text(detailStr.slice(0, 40), 150, y);
    y += 5;
  }

  if (!input.rows.length) {
    doc.setTextColor(120);
    doc.text("No activity recorded yet.", 14, y + 4);
  }

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`Pariksha · Confidential · Page ${i} of ${pages}`, 14, 292);
  }

  doc.save(`pariksha-activity-${input.userName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`);
}

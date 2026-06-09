import jsPDF from "jspdf";
import QRCode from "qrcode";
import logoAsset from "@/assets/pariksha-logo.png.asset.json";

export interface AdmitCardData {
  candidateName: string;
  admitCardNumber: string;
  seatNumber: string | null;
  examTitle: string;
  examDate: string;
  startTime: string;
  durationMinutes: number;
  centerName?: string;
  centerAddress?: string;
  photoUrl?: string | null;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadAdmitCard(d: AdmitCardData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;

  // Header bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PARIKSHA", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("National Examination Platform — Admit Card", 14, 21);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(d.examTitle, 14, 42);

  // Candidate photo (top-right area, above QR)
  if (d.photoUrl) {
    const photoData = await fetchImageAsDataUrl(d.photoUrl);
    if (photoData) {
      try {
        doc.addImage(photoData, "JPEG", 150, 50, 35, 42);
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.rect(150, 50, 35, 42);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text("Verified photo", 156, 96);
      } catch {
        // ignore image errors
      }
    }
  }

  // QR
  const qrPayload = JSON.stringify({
    admitCard: d.admitCardNumber,
    seat: d.seatNumber,
    exam: d.examTitle,
    date: d.examDate,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 1 });
  doc.addImage(qrDataUrl, "PNG", 150, 100, 35, 35);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Scan at entry", 156, 139);

  // Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  const rows: [string, string][] = [
    ["Candidate", d.candidateName],
    ["Admit Card No.", d.admitCardNumber],
    ["Seat Number", d.seatNumber ?? "—"],
    ["Exam Date", d.examDate],
    ["Reporting Time", d.startTime],
    ["Duration", `${d.durationMinutes} minutes`],
    ["Center", d.centerName ?? "TBA"],
  ];
  let y = 55;
  rows.forEach(([k, v]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(k, 14, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(v, 55, y);
    y += 8;
  });

  // Instructions
  doc.setDrawColor(220);
  doc.line(14, 150, W - 14, 150);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Instructions", 14, 160);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  const instructions = [
    "1. Report 60 minutes before the exam start time.",
    "2. Carry a valid photo ID and this admit card (printout or device).",
    "3. Electronic devices, calculators and notes are not permitted.",
    "4. Verify QR scan at entry — biometric & face match will follow.",
    "5. Late entry is not allowed after the first 30 minutes.",
  ];
  instructions.forEach((line, i) => doc.text(line, 14, 168 + i * 6));

  // Footer
  doc.setFillColor(245, 246, 250);
  doc.rect(0, 280, W, 17, "F");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Protected by TriShield Vault — paper integrity verified at runtime.", 14, 290);
  doc.text(`Generated ${new Date().toLocaleString()}`, 14, 295);

  doc.save(`admit-card-${d.admitCardNumber}.pdf`);
}

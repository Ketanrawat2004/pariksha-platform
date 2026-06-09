import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface CertificateData {
  candidateName: string;
  examTitle: string;
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  rank?: number | null;
  examDate: string;
  certificateId: string;
}

export async function downloadCertificate(d: CertificateData) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = 297;
  const H = 210;

  // Background
  doc.setFillColor(252, 252, 255);
  doc.rect(0, 0, W, H, "F");

  // Decorative border
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, W - 16, H - 16);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, W - 24, H - 24);

  // Top brand
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PARIKSHA", W / 2, 25, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("NATIONAL EXAMINATION PLATFORM", W / 2, 31, { align: "center" });

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Certificate of Achievement", W / 2, 60, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text("This certificate is proudly presented to", W / 2, 75, { align: "center" });

  // Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(20, 60, 180);
  doc.text(d.candidateName, W / 2, 95, { align: "center" });

  // Line under name
  doc.setDrawColor(200);
  doc.line(W / 2 - 60, 100, W / 2 + 60, 100);

  // Body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(
    `for successfully completing the examination`,
    W / 2,
    112,
    { align: "center" }
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`"${d.examTitle}"`, W / 2, 122, { align: "center" });

  // Score box
  doc.setFillColor(240, 245, 255);
  doc.rect(W / 2 - 60, 132, 120, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Score: ${d.scoreObtained} / ${d.totalMarks}`, W / 2 - 50, 144);
  doc.text(`Percentage: ${d.percentage.toFixed(2)}%`, W / 2 - 50, 152);
  if (d.rank) doc.text(`Rank: #${d.rank}`, W / 2 + 20, 144);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Awarded on ${d.examDate}`, W / 2 + 20, 152);

  // QR for verification
  const qrPayload = `https://pariksha.in/verify/${d.certificateId}`;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 1 });
  doc.addImage(qrDataUrl, "PNG", 20, 165, 28, 28);
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text("Verify authenticity", 20, 197);

  // Signatures
  doc.setDrawColor(15, 23, 42);
  doc.line(W - 90, 185, W - 30, 185);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("Examination Controller", W - 60, 192, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(`Certificate ID: ${d.certificateId}`, W - 60, 198, { align: "center" });

  doc.save(`certificate-${d.certificateId}.pdf`);
}

import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface ScoreReportData {
  candidateName: string;
  examTitle: string;
  scoreObtained: number;
  totalMarks: number;
  percentage: number;
  passingMarks?: number;
  examDate: string;
  resultId: string;
}

export async function downloadScoreReport(d: ScoreReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W = 210;
  const H = 297;

  // Background band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 32, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PARIKSHA", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Official Score Report", 14, 24);

  // Title
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Score Report", 14, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text("This report certifies that the candidate named below participated in the", 14, 62);
  doc.text("following examination. The score breakdown is shown for the record.", 14, 68);

  // Candidate block
  doc.setFillColor(245, 247, 252);
  doc.rect(14, 78, W - 28, 36, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("CANDIDATE", 20, 86);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.text(d.candidateName, 20, 96);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Examination: ${d.examTitle}`, 20, 104);
  doc.text(`Date: ${d.examDate}`, 20, 110);

  // Score box
  const passed = d.scoreObtained >= (d.passingMarks ?? Math.ceil(d.totalMarks * 0.35));
  doc.setFillColor(passed ? 220 : 254, passed ? 252 : 232, passed ? 231 : 232);
  doc.rect(14, 122, W - 28, 50, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(passed ? 22 : 180, passed ? 163 : 30, passed ? 74 : 30);
  doc.text(`${d.scoreObtained} / ${d.totalMarks}`, W / 2, 148, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${d.percentage.toFixed(2)}%`, W / 2, 162, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(passed ? 22 : 180, passed ? 163 : 30, passed ? 74 : 30);
  doc.text(passed ? "PASSED" : "NOT PASSED — KEEP PRACTISING", W / 2, 170, { align: "center" });

  // Encouragement / next steps
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60);
  if (!passed) {
    doc.text("Recommended next steps:", 14, 188);
    doc.setFontSize(9);
    doc.setTextColor(90);
    [
      "• Review the topics where you scored low and retake the practice tests in your dashboard.",
      "• Schedule another attempt once you feel ready — every attempt is recorded for your growth.",
      "• Reach out to your institute mentor for a personalised study plan.",
    ].forEach((line, i) => doc.text(line, 14, 196 + i * 6));
  } else {
    doc.text("Congratulations — a separate Certificate of Achievement is available in your dashboard.", 14, 188);
  }

  // QR verification
  const qrUrl = `https://pariksha.in/verify/${d.resultId}`;
  const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 256, margin: 1 });
  doc.addImage(qrDataUrl, "PNG", W - 50, 222, 36, 36);
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text("Verify authenticity", W - 50, 262);

  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(`Report ID: ${d.resultId.slice(0, 12).toUpperCase()}`, 14, 252);
  doc.text(`Issued: ${new Date().toLocaleString()}`, 14, 258);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text("Pariksha · This is an official score report and is system-generated.", 14, 288);

  doc.save(`pariksha-score-report-${d.resultId.slice(0, 8)}.pdf`);
}

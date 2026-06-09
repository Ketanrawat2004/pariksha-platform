// Re-export shim: browser-only helpers. Do not import from server code.
export { downloadCertificate } from "@/lib/pdf/certificate";
export { downloadAdmitCard } from "@/lib/pdf/admit-card";
export { signFacePhotoUrl, useSignedFacePhoto } from "@/lib/storage/face-photo";

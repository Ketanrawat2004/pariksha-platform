/**
 * Per-candidate diagonal watermark for the exam paper view.
 * Deters screenshot / camera-leak of question content — any leaked image
 * carries the candidate's identifier and a server-derived timestamp.
 *
 * Pointer-events disabled, fully decorative, sits above content but below
 * modals/toasts. Repeats across the viewport with a CSS tiled pattern.
 */
type Props = { label: string };

export function ExamWatermark({ label }: Props) {
  const text = label.slice(0, 80);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] select-none overflow-hidden mix-blend-multiply dark:mix-blend-screen"
      style={{ contain: "strict" }}
    >
      <div
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.12]"
        style={{
          transform: "rotate(-28deg) scale(1.4)",
          transformOrigin: "center",
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0 70px, transparent 70px 140px)",
        }}
      >
        <div
          className="grid h-full w-full text-[11px] font-bold tracking-widest text-foreground"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gridAutoRows: "70px",
            alignItems: "center",
            justifyItems: "center",
          }}
        >
          {Array.from({ length: 160 }).map((_, i) => (
            <span key={i} className="whitespace-nowrap">
              PARIKSHA · {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

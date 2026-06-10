/**
 * On-device proctoring detector using TensorFlow.js COCO-SSD.
 * Single shared model — used for BOTH suspicious-object detection and
 * person presence (replacing flaky face-api.js wasm bindings).
 */
const SUSPICIOUS = new Set([
  "cell phone",
  "book",
  "laptop",
  "remote",
  "tv",
  "tablet",
  "keyboard",
  "mouse",
  "headphones",
]);

type Prediction = { class: string; score: number };
type CocoDetector = {
  detect: (input: HTMLVideoElement, maxNumBoxes?: number, minScore?: number) => Promise<Prediction[]>;
};

let detectorPromise: Promise<CocoDetector> | null = null;

async function getDetector(): Promise<CocoDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      // mobilenet_v2 (full) is more accurate than lite for small/held-up phones.
      const model = await cocoSsd.load({ base: "mobilenet_v2" });
      // eslint-disable-next-line no-console
      console.info("[proctor] coco-ssd model ready");
      return model as unknown as CocoDetector;
    })();
  }
  return detectorPromise;
}

export type FrameAnalysis = {
  personCount: number;
  suspicious: { label: string; score: number } | null;
  raw: Prediction[];
};

/** One-pass analysis: returns both person presence and any suspicious object. */
export async function analyzeFrame(video: HTMLVideoElement): Promise<FrameAnalysis | null> {
  if (video.readyState < 2) return null;
  const det = await getDetector();
  // Lower score floor so held-up phones (often 0.3–0.5) still register.
  const preds = await det.detect(video, 20, 0.3);
  let personCount = 0;
  let suspicious: { label: string; score: number } | null = null;
  for (const p of preds) {
    if (p.class === "person" && p.score >= 0.5) personCount += 1;
    if (SUSPICIOUS.has(p.class) && p.score >= 0.35) {
      if (!suspicious || p.score > suspicious.score) suspicious = { label: p.class, score: p.score };
    }
  }
  return { personCount, suspicious, raw: preds };
}

/** Legacy single-purpose helper kept for compatibility. */
export async function detectSuspiciousObject(video: HTMLVideoElement): Promise<{ label: string; score: number } | null> {
  const a = await analyzeFrame(video);
  return a?.suspicious ?? null;
}

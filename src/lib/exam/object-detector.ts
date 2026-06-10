/**
 * On-device suspicious-object detector using TensorFlow.js COCO-SSD.
 * Returns a label when something exam-suspicious is in frame (phone, book, laptop, etc.).
 * Lazy-loaded so the exam page doesn't pay the model cost up front.
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

type CocoDetector = {
  detect: (input: HTMLVideoElement) => Promise<Array<{ class: string; score: number }>>;
};

let detectorPromise: Promise<CocoDetector> | null = null;

async function getDetector(): Promise<CocoDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      // mobilenet_v2 (full) is more accurate than lite for small/held-up phones.
      const model = await cocoSsd.load({ base: "mobilenet_v2" });
      return model as unknown as CocoDetector;
    })();
  }
  return detectorPromise;
}

export async function detectSuspiciousObject(video: HTMLVideoElement): Promise<{ label: string; score: number } | null> {
  if (video.readyState < 2) return null;
  const det = await getDetector();
  const preds = await det.detect(video);
  // Lower threshold — phones held close to camera often score 0.4–0.55.
  const hit = preds.find((p) => SUSPICIOUS.has(p.class) && p.score > 0.4);
  return hit ? { label: hit.class, score: hit.score } : null;
}


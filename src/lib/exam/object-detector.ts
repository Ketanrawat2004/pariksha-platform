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
      const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
      return model as unknown as CocoDetector;
    })();
  }
  return detectorPromise;
}

export async function detectSuspiciousObject(video: HTMLVideoElement): Promise<{ label: string; score: number } | null> {
  if (video.readyState < 2) return null;
  const det = await getDetector();
  const preds = await det.detect(video);
  const hit = preds.find((p) => SUSPICIOUS.has(p.class) && p.score > 0.55);
  return hit ? { label: hit.class, score: hit.score } : null;
}

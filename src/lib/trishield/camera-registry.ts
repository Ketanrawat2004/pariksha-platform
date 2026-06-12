// Global registry of active MediaStreams used by TriShield camera flows.
// Lets us defensively stop every track on sign-out, tab close/hide, or
// when a parent forces a teardown — independent of React unmount timing.

const active = new Set<MediaStream>();
let installed = false;

function stopAll() {
  for (const s of active) {
    try { s.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
  }
  active.clear();
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  // Stop when the tab is hidden/closed so the OS camera light goes off.
  window.addEventListener("pagehide", stopAll);
  window.addEventListener("beforeunload", stopAll);
}

export function registerCameraStream(stream: MediaStream) {
  install();
  active.add(stream);
}

export function unregisterCameraStream(stream: MediaStream) {
  active.delete(stream);
}

export function stopAllCameraStreams() {
  stopAll();
}

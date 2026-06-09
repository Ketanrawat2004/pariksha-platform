import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/auth-context";

export type WatchParty = "institute" | "admin" | "superadmin";

export interface WatchSessionRow {
  id: string;
  exam_id: string | null;
  paper_submission_id: string | null;
  session_type: "paper_lock" | "paper_edit";
  initiated_by: string;
  institute_camera_active: boolean;
  admin_camera_active: boolean;
  superadmin_camera_active: boolean;
  all_parties_present: boolean;
  institute_snapshot_count: number;
  admin_snapshot_count: number;
  superadmin_snapshot_count: number;
  admin_joined_at: string | null;
  superadmin_joined_at: string | null;
  status: "active" | "completed" | "halted" | "timed_out";
  session_started_at: string;
  session_ended_at: string | null;
}

function buildFingerprint() {
  if (typeof window === "undefined") return {};
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    width: screen.width,
    height: screen.height,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

interface InitOptions {
  party: WatchParty;
  paperSubmissionId?: string | null;
  examId?: string | null;
  sessionType?: "paper_lock" | "paper_edit";
  /** when party=institute: existing session row id to attach to, otherwise create. */
  existingSessionId?: string | null;
  /** When false (drawer not opened, etc.) the hook does nothing. */
  enabled: boolean;
}

/**
 * Drives the TriShield LiveWatch lifecycle for a single party:
 * - requests getUserMedia (video only)
 * - exposes denied/granted state + the live stream
 * - creates (institute) or joins (admin/superadmin) the watch session row
 * - uploads a JPEG snapshot every 10s
 * - subscribes to the session row via realtime
 */
export function useTriShieldWatch(opts: InitOptions) {
  const { user } = useAuth();
  const [denied, setDenied] = useState(false);
  const [granted, setGranted] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [session, setSession] = useState<WatchSessionRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const partyRef = useRef<WatchParty>(opts.party);
  partyRef.current = opts.party;

  const requestCamera = useCallback(async () => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 360, facingMode: "user" },
        audio: false,
      });
      setStream(s);
      setGranted(true);
      setDenied(false);
    } catch (e: any) {
      setDenied(true);
      setGranted(false);
      setError(e?.message ?? "Camera permission denied");
    }
  }, []);

  // Auto-request when enabled
  useEffect(() => {
    if (!opts.enabled || granted || denied) return;
    void requestCamera();
  }, [opts.enabled, granted, denied, requestCamera]);

  // Attach stream to <video> when both available. Re-runs whenever the
  // consumer mounts/remounts the <video> element (e.g. drawer opens later).
  useEffect(() => {
    const v = videoRef.current;
    if (v && stream && v.srcObject !== stream) {
      v.srcObject = stream;
      void v.play().catch(() => {});
    }
  });

  // Create or join the session row when camera granted
  useEffect(() => {
    if (!granted || !user || !opts.enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const fingerprint = buildFingerprint();
        if (opts.party === "institute") {
          if (opts.existingSessionId) {
            sessionIdRef.current = opts.existingSessionId;
            const { data } = await supabase
              .from("trishield_watch_sessions" as any)
              .update({
                institute_camera_active: true,
                institute_device_fingerprint: fingerprint as any,
              })
              .eq("id", opts.existingSessionId)
              .select()
              .single();
            if (!cancelled && data) setSession(data as any);
          } else {
            const { data, error } = await supabase
              .from("trishield_watch_sessions" as any)
              .insert({
                paper_submission_id: opts.paperSubmissionId ?? null,
                exam_id: opts.examId ?? null,
                session_type: opts.sessionType ?? "paper_lock",
                initiated_by: user.id,
                institute_camera_active: true,
                institute_device_fingerprint: fingerprint as any,
              } as any)
              .select()
              .single();
            if (error) throw error;
            if (!cancelled && data) {
              sessionIdRef.current = (data as any).id;
              setSession(data as any);
            }
          }
        } else {
          // admin / superadmin: join existing session
          if (!opts.existingSessionId) return;
          sessionIdRef.current = opts.existingSessionId;
          const patch: Record<string, any> =
            opts.party === "admin"
              ? {
                  admin_camera_active: true,
                  admin_joined_at: new Date().toISOString(),
                  admin_device_fingerprint: fingerprint,
                }
              : {
                  superadmin_camera_active: true,
                  superadmin_joined_at: new Date().toISOString(),
                  superadmin_device_fingerprint: fingerprint,
                };
          const { data } = await supabase
            .from("trishield_watch_sessions" as any)
            .update(patch)
            .eq("id", opts.existingSessionId)
            .select()
            .single();
          if (!cancelled && data) setSession(data as any);
        }
      } catch (e: any) {
        setError(e?.message ?? "Failed to attach session");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, user?.id, opts.enabled, opts.existingSessionId]);

  // Realtime subscription to the row
  useEffect(() => {
    const sid = session?.id;
    if (!sid) return;
    const ch = supabase
      .channel(`trishield-watch:${sid}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trishield_watch_sessions", filter: `id=eq.${sid}` },
        (payload) => setSession(payload.new as any),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [session?.id]);

  // 10s snapshot loop
  useEffect(() => {
    if (!session?.id || !stream || !granted) return;
    const sid = session.id;
    const examId = session.exam_id ?? "no-exam";
    const party = partyRef.current;

    async function takeSnapshot() {
      try {
        const v = videoRef.current;
        const c = canvasRef.current;
        if (!v || !c || v.readyState < 2) return;
        c.width = 320;
        c.height = 240;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, 320, 240);
        const blob: Blob | null = await new Promise((res) =>
          c.toBlob((b) => res(b), "image/jpeg", 0.6),
        );
        if (!blob) return;
        const path = `${party}/${examId}/${sid}/${Date.now()}.jpg`;
        const up = await supabase.storage
          .from("session-recordings")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) return;
        await supabase.rpc("increment_watch_snapshot" as any, {
          _session_id: sid,
          _party: party,
        } as any);
      } catch {
        /* swallow per-tick failures */
      }
    }

    // First snapshot immediately, then every 10s
    void takeSnapshot();
    intervalRef.current = window.setInterval(takeSnapshot, 10_000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [session?.id, stream, granted]);

  // Clean up on unmount: stop tracks + mark session ended (institute only)
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      const sid = sessionIdRef.current;
      const party = partyRef.current;
      if (sid) {
        const patch: Record<string, any> =
          party === "institute"
            ? { institute_camera_active: false, status: "completed", session_ended_at: new Date().toISOString() }
            : party === "admin"
              ? { admin_camera_active: false }
              : { superadmin_camera_active: false };
        void supabase
          .from("trishield_watch_sessions" as any)
          .update(patch)
          .eq("id", sid);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    denied,
    granted,
    stream,
    session,
    error,
    videoRef,
    canvasRef,
    requestCamera,
  };
}

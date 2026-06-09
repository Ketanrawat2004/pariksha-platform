import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type WitnessParty = "admin" | "superadmin";

interface CeremonyState {
  adminConfirmed: boolean;
  superadminConfirmed: boolean;
  expiresAt: number | null;
  active: boolean;
}

const CEREMONY_TIMEOUT_MS = 60_000;

/**
 * Institute side — requests the 3-way lock-ceremony witness confirmation.
 * Broadcasts "request" on `lock-ceremony:{sessionId}`, listens for
 * "confirm" events from admin + superadmin, and times out after 60s.
 */
export function useLockCeremonyInitiator(sessionId: string | null | undefined) {
  const [state, setState] = useState<CeremonyState>({
    adminConfirmed: false,
    superadminConfirmed: false,
    expiresAt: null,
    active: false,
  });
  const chRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase.channel(`lock-ceremony:${sessionId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "confirm" }, ({ payload }) => {
      const party = (payload as any)?.party as WitnessParty | undefined;
      if (party !== "admin" && party !== "superadmin") return;
      setState((s) =>
        party === "admin" ? { ...s, adminConfirmed: true } : { ...s, superadminConfirmed: true },
      );
    });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      chRef.current = null;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [sessionId]);

  // Auto-cancel on timeout
  useEffect(() => {
    if (!state.active || !state.expiresAt) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setState((s) => {
        if (!s.active || !s.expiresAt) return s;
        if (Date.now() >= s.expiresAt && !(s.adminConfirmed && s.superadminConfirmed)) {
          return { adminConfirmed: false, superadminConfirmed: false, expiresAt: null, active: false };
        }
        return s;
      });
    }, 500);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [state.active, state.expiresAt]);

  function start() {
    const ch = chRef.current;
    if (!ch) return;
    setState({ adminConfirmed: false, superadminConfirmed: false, expiresAt: Date.now() + CEREMONY_TIMEOUT_MS, active: true });
    void ch.send({ type: "broadcast", event: "request", payload: { ts: Date.now() } });
  }
  function cancel() {
    const ch = chRef.current;
    void ch?.send({ type: "broadcast", event: "cancel", payload: {} });
    setState({ adminConfirmed: false, superadminConfirmed: false, expiresAt: null, active: false });
  }

  const bothConfirmed = state.adminConfirmed && state.superadminConfirmed;
  const secondsLeft = state.expiresAt ? Math.max(0, Math.ceil((state.expiresAt - Date.now()) / 1000)) : 0;
  return { ...state, bothConfirmed, secondsLeft, start, cancel };
}

/**
 * Staff side — listens for ceremony requests and exposes a confirm() fn.
 */
export function useLockCeremonyWitness(sessionId: string | null | undefined, party: WitnessParty) {
  const [requested, setRequested] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const chRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase.channel(`lock-ceremony:${sessionId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "request" }, () => {
      setRequested(true);
      setConfirmed(false);
    });
    ch.on("broadcast", { event: "cancel" }, () => {
      setRequested(false);
      setConfirmed(false);
    });
    ch.subscribe();
    chRef.current = ch;
    return () => {
      void supabase.removeChannel(ch);
      chRef.current = null;
    };
  }, [sessionId]);

  function confirm() {
    const ch = chRef.current;
    if (!ch) return;
    void ch.send({ type: "broadcast", event: "confirm", payload: { party } });
    setConfirmed(true);
  }
  function dismiss() {
    setRequested(false);
  }

  return { requested, confirmed, confirm, dismiss };
}

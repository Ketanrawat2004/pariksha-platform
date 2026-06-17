import type { WatchSessionRow } from "@/lib/trishield/use-trishield-watch";
import { Radio } from "lucide-react";

function Dot({ state }: { state: "off" | "joined" | "live" }) {
  const cls =
    state === "live"
      ? "bg-success"
      : state === "joined"
        ? "bg-warning"
        : "bg-destructive";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} />;
}

function Party({ label, count, active, joinedAt }: { label: string; count: number; active: boolean; joinedAt?: string | null }) {
  const state: "off" | "joined" | "live" = active ? "live" : joinedAt ? "joined" : "off";
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-white/5 px-3 py-1.5">
      <Dot state={state} />
      <span className="truncate text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className="shrink-0 text-xs text-white/60">· {count} snaps</span>
    </div>
  );
}

export function TriShieldWatchBar({ session, sticky = true }: { session: WatchSessionRow | null; sticky?: boolean }) {
  return (
    <div className={`${sticky ? "sticky top-0" : ""} z-40 -mx-4 mb-4 grid grid-cols-[minmax(0,1fr)] gap-3 bg-slate-900 px-4 py-2 text-white shadow-lg sm:-mx-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-6`}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
          <Radio className="h-4 w-4 shrink-0" />
          <span className="truncate">TriShield LiveWatch Active</span>
        </span>
        {session?.join_code && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-xs">
            <span className="uppercase tracking-wider text-white/60">Join code</span>
            <span className="font-mono text-base font-bold tracking-[0.3em]">{session.join_code}</span>
          </span>
        )}
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:ml-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end">
        <Party label="Institute" count={session?.institute_snapshot_count ?? 0} active={!!session?.institute_camera_active} joinedAt={session?.session_started_at} />
        <Party label="Admin" count={session?.admin_snapshot_count ?? 0} active={!!session?.admin_camera_active} joinedAt={session?.admin_joined_at} />
        <Party label="SuperAdmin" count={session?.superadmin_snapshot_count ?? 0} active={!!session?.superadmin_camera_active} joinedAt={session?.superadmin_joined_at} />
      </div>
    </div>
  );
}

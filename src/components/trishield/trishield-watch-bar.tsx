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
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5">
      <Dot state={state} />
      <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className="text-xs text-white/60">· {count} snaps</span>
    </div>
  );
}

export function TriShieldWatchBar({ session, sticky = true }: { session: WatchSessionRow | null; sticky?: boolean }) {
  return (
    <div className={`${sticky ? "sticky top-0" : ""} z-40 -mx-4 sm:-mx-6 mb-4 bg-slate-900 text-white px-4 sm:px-6 py-2 flex flex-wrap items-center gap-3 shadow-lg`}>
      <span className="flex items-center gap-2 font-semibold text-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
        </span>
        <Radio className="h-4 w-4" /> TriShield LiveWatch Active
      </span>
      <div className="flex flex-wrap items-center gap-2 ml-auto">
        <Party label="Institute" count={session?.institute_snapshot_count ?? 0} active={!!session?.institute_camera_active} joinedAt={session?.session_started_at} />
        <Party label="Admin" count={session?.admin_snapshot_count ?? 0} active={!!session?.admin_camera_active} joinedAt={session?.admin_joined_at} />
        <Party label="SuperAdmin" count={session?.superadmin_snapshot_count ?? 0} active={!!session?.superadmin_camera_active} joinedAt={session?.superadmin_joined_at} />
      </div>
    </div>
  );
}

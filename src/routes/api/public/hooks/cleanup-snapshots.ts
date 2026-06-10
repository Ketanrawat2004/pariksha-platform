import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron-callable cleanup: deletes session-recordings snapshots older than 90 days.
 * Authenticated with a dedicated server-only CRON_SECRET (never the public anon key).
 */
export const Route = createFileRoute("/api/public/hooks/cleanup-snapshots")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const provided = request.headers.get("x-cron-secret") ?? request.headers.get("apikey") ?? "";
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected) {
          return new Response("Server misconfigured: CRON_SECRET not set", { status: 500 });
        }
        // Constant-time compare
        const a = new TextEncoder().encode(provided);
        const b = new TextEncoder().encode(expected);
        let mismatch = a.length ^ b.length;
        for (let i = 0; i < Math.min(a.length, b.length); i++) mismatch |= a[i] ^ b[i];
        if (mismatch !== 0) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        let deleted = 0;
        for (const party of ["institute", "admin", "superadmin"]) {
          const { data: examFolders } = await supabaseAdmin.storage.from("session-recordings").list(party, { limit: 1000 });
          for (const ex of examFolders ?? []) {
            const { data: sessFolders } = await supabaseAdmin.storage.from("session-recordings").list(`${party}/${ex.name}`, { limit: 1000 });
            for (const sf of sessFolders ?? []) {
              const { data: files } = await supabaseAdmin.storage.from("session-recordings").list(`${party}/${ex.name}/${sf.name}`, { limit: 1000 });
              const toDelete = (files ?? [])
                .filter((f) => {
                  const ts = Number(f.name.replace(/\.jpg$/, ""));
                  return !Number.isNaN(ts) && ts < cutoff;
                })
                .map((f) => `${party}/${ex.name}/${sf.name}/${f.name}`);
              if (toDelete.length) {
                const { error } = await supabaseAdmin.storage.from("session-recordings").remove(toDelete);
                if (!error) deleted += toDelete.length;
              }
            }
          }
        }
        return Response.json({ ok: true, deleted });
      },
    },
  },
});

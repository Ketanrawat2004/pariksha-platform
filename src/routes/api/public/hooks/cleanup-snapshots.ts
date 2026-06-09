import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron-callable cleanup: deletes session-recordings snapshots older than 90 days.
 * Wired via pg_cron + pg_net (set up separately).
 */
export const Route = createFileRoute("/api/public/hooks/cleanup-snapshots")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require the Supabase anon key in the `apikey` header — the canonical
        // pattern for /api/public/* endpoints invoked by pg_cron + pg_net.
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
        let deleted = 0;
        // Walk top-level party folders
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

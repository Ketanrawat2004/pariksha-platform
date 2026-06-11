import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ping")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, t: Date.now() }), {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        }),
    },
  },
});

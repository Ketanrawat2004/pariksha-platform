import { createFileRoute } from "@tanstack/react-router";
import deckPdf from "@/assets/Pariksha_FINAL.pdf.asset.json";

export const Route = createFileRoute("/api/public/deck/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const upstream = await fetch(origin + deckPdf.url);
        if (!upstream.ok) {
          return new Response("PDF not available", { status: 502 });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": 'inline; filename="Pariksha_FINAL.pdf"',
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

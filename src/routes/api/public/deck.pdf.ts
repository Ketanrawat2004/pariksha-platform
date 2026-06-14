import { createFileRoute } from "@tanstack/react-router";
import deckPdf from "@/assets/Pariksha_FINAL.pdf.asset.json";

export const Route = createFileRoute("/api/public/deck/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return Response.redirect(new URL(deckPdf.url, request.url), 302);
      },
    },
  },
});

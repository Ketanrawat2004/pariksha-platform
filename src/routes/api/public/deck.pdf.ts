import { createFileRoute } from "@tanstack/react-router";

const DECK_PDF_URL = "/__l5e/assets-v1/98f6adfc-3e4e-4bd0-83d2-09570e8a9387/Pariksha_FINAL.pdf";

export const Route = createFileRoute("/api/public/deck/pdf")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return Response.redirect(new URL(DECK_PDF_URL, request.url).toString(), 302);
      },
    },
  },
});

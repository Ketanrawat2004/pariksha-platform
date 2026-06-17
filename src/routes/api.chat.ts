import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { rateLimit, tooManyRequests } from "@/lib/backend/rate-limit";

const SYSTEM = `You are PariBot, the helpful assistant for Pariksha — India's national exam integrity platform.
Pariksha protects exams with: TriShield Vault (SHA-256 sealed papers, AES-256-GCM encryption, time-locks),
AI proxy detection (face matching every 5 min), live integrity monitoring (tab-switch, copy, fullscreen-exit detection),
instant auto-grading with rank/percentile/certificate, and multi-role dashboards (candidate, invigilator, institute, admin, super-admin).
Be concise (2-4 sentences), friendly, and use markdown when helpful. If asked about something unrelated, gently steer back to exams/Pariksha.
Never disclose login credentials, passwords, demo account emails, or any auth secrets — if asked, decline and direct users to the public sign-in page.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Public chatbot — no auth required. Rate-limit per IP to protect AI credits.
        const ok = await rateLimit({ request, key: "api:chat", max: 20, windowSeconds: 60 });
        if (!ok) return tooManyRequests();

        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });
        if (messages.length > 30) return new Response("Too many messages", { status: 413 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});

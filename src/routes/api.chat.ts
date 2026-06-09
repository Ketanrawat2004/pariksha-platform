import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM = `You are PariBot, the helpful assistant for Pariksha — India's national exam integrity platform.
Pariksha protects exams with: TriShield Vault (SHA-256 sealed papers, AES-256-GCM encryption, time-locks),
AI proxy detection (face matching every 5 min), live integrity monitoring (tab-switch, copy, fullscreen-exit detection),
instant auto-grading with rank/percentile/certificate, and multi-role dashboards (candidate, invigilator, institute, admin, super-admin).
Demo accounts: candidate@pariksha.in, invigilator@pariksha.in, admin@pariksha.in, superadmin@pariksha.in, institute@pariksha.in — all use Demo@1234.
Be concise (2-4 sentences), friendly, and use markdown when helpful. If asked about something unrelated, gently steer back to exams/Pariksha.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Require an authenticated Supabase user — protects LOVABLE_API_KEY quota.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
        if (!token) return new Response("Unauthorized", { status: 401 });
        try {
          const { createClient } = await import("@supabase/supabase-js");
          const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
          const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
          const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
          const { data, error } = await sb.auth.getUser();
          if (error || !data.user) return new Response("Unauthorized", { status: 401 });
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) return new Response("Messages required", { status: 400 });
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

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestIP, getRequest } from "@tanstack/react-start/server";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(4000),
});

function makeCaseRef() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `PRK-${out}`;
}

export const submitSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate-limit: per IP, 5 per hour
    let ip = "unknown";
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    } catch {
      /* ignore */
    }
    const { data: allowed } = await supabaseAdmin.rpc("check_rate_limit", {
      _key: `support:${ip}`,
      _max: 5,
      _window_seconds: 3600,
    });
    if (allowed === false) {
      throw new Error("Too many submissions. Please try again later.");
    }

    // If the caller is logged in, capture created_by so the reply notification
    // can be delivered back to that candidate via the support_ticket_reply_notify trigger.
    let createdBy: string | null = null;
    try {
      const req = getRequest();
      const authHeader = req.headers.get("authorization");
      const token = authHeader && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : null;
      if (token) {
        const { data: userRes } = await supabaseAdmin.auth.getUser(token);
        createdBy = userRes.user?.id ?? null;
      }
    } catch {
      /* ignore — anonymous submission */
    }

    const case_ref = makeCaseRef();
    const { error } = await supabaseAdmin.from("support_tickets").insert({
      case_ref,
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
      created_by: createdBy,
    });
    if (error) throw new Error("Could not submit ticket. Please try again.");
    return { case_ref };
  });

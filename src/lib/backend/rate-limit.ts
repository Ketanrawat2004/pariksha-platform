/**
 * Server-only rate-limit helper. Backed by public.check_rate_limit() in the DB.
 * Returns true if the request should proceed, false if it has been throttled.
 */
export async function rateLimit(opts: {
  request: Request;
  key: string;
  max?: number;
  windowSeconds?: number;
}): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ip =
    opts.request.headers.get("cf-connecting-ip") ||
    (opts.request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ||
    "unknown";
  const max = opts.max ?? 30;
  const windowSeconds = opts.windowSeconds ?? 60;
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit" as any, {
    _key: `${opts.key}:${ip}`,
    _max: max,
    _window_seconds: windowSeconds,
  } as any);
  if (error) {
    // Fail-open on infra error so legit traffic isn't blocked, but log.
    console.warn("rate_limit_error", error.message);
    return true;
  }
  return Boolean(data);
}

export function tooManyRequests(): Response {
  return new Response("Too many requests", {
    status: 429,
    headers: { "retry-after": "60" },
  });
}

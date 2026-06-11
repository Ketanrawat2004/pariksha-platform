import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const severityEnum = z.enum(["minor", "major", "critical"]);
const statusEnum = z.enum(["investigating", "identified", "monitoring", "resolved"]);

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("current_user_has_any_role", {
    _roles: ["admin", "superadmin"],
  });
  if (error || !data) throw new Error("forbidden");
}

export const listIncidentsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("incidents")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        severity: severityEnum,
        status: statusEnum.default("investigating"),
        summary: z.string().trim().max(4000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("incidents")
      .insert({
        title: data.title,
        severity: data.severity,
        status: data.status,
        summary: data.summary,
        created_by: context.userId,
        resolved_at: data.status === "resolved" ? new Date().toISOString() : null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        severity: severityEnum.optional(),
        status: statusEnum.optional(),
        summary: z.string().trim().max(4000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.severity !== undefined) patch.severity = data.severity;
    if (data.summary !== undefined) patch.summary = data.summary;
    if (data.status !== undefined) {
      patch.status = data.status;
      patch.resolved_at = data.status === "resolved" ? new Date().toISOString() : null;
    }
    const { data: row, error } = await context.supabase
      .from("incidents")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("incidents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

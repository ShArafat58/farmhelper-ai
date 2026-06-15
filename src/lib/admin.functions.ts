import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const head = { count: "exact" as const, head: true };
    const [users, listings, posts, diagnoses, openReports] = await Promise.all([
      context.supabase.from("profiles").select("id", head),
      context.supabase.from("market_listings").select("id", head),
      context.supabase.from("community_posts").select("id", head),
      context.supabase.from("diagnoses").select("id", head),
      context.supabase.from("listing_reports").select("id", head).eq("status", "open"),
    ]);
    return {
      users: users.count ?? 0,
      listings: listings.count ?? 0,
      posts: posts.count ?? 0,
      diagnoses: diagnoses.count ?? 0,
      openReports: openReports.count ?? 0,
    };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: reports, error } = await context.supabase
      .from("listing_reports")
      .select("id, listing_id, reporter_id, reason, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    if (!reports?.length) return [];
    const ids = [...new Set(reports.map((r: any) => r.listing_id))];
    const reporterIds = [...new Set(reports.map((r: any) => r.reporter_id))];
    const [listings, reporters] = await Promise.all([
      context.supabase.from("market_listings").select("id, crop_name, status, user_id, region, country, price, currency").in("id", ids),
      context.supabase.from("profiles").select("id, full_name").in("id", reporterIds),
    ]);
    const lmap = new Map((listings.data ?? []).map((l: any) => [l.id, l]));
    const rmap = new Map((reporters.data ?? []).map((r: any) => [r.id, r]));
    return reports.map((r: any) => ({
      ...r,
      listing: lmap.get(r.listing_id) ?? null,
      reporter: rmap.get(r.reporter_id) ?? null,
    }));
  });

export const moderateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      listing_id: z.string().uuid(),
      action: z.enum(["hide", "restore"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const status = data.action === "hide" ? "removed" : "active";
    const { error } = await context.supabase
      .from("market_listings")
      .update({ status, moderated_by: context.userId, moderated_at: new Date().toISOString() })
      .eq("id", data.listing_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      report_id: z.string().uuid(),
      status: z.enum(["resolved", "dismissed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("listing_reports")
      .update({
        status: data.status,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.report_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const moderatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      post_id: z.string().uuid(),
      action: z.enum(["hide", "restore"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const status = data.action === "hide" ? "hidden" : "visible";
    const { error } = await context.supabase
      .from("community_posts")
      .update({ status, moderated_by: context.userId, moderated_at: new Date().toISOString() })
      .eq("id", data.post_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

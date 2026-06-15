import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DAILY_REVEAL_CAP = 10;

const listingSchema = z.object({
  crop_name: z.string().trim().min(1).max(80),
  qty: z.coerce.number().positive().max(1_000_000),
  unit: z.string().trim().min(1).max(20),
  price: z.coerce.number().positive().max(10_000_000),
  currency: z.string().trim().min(2).max(8),
  country: z.string().trim().length(2).optional().nullable(),
  region: z.string().trim().max(80).optional().nullable(),
  contact_phone: z.string().trim().min(4).max(30),
  image_path: z.string().trim().max(300).optional().nullable(),
});

export const listPricesForRegion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      country: z.string().trim().length(2).optional().nullable(),
      region: z.string().trim().max(80).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("market_prices")
      .select("*")
      .order("as_of", { ascending: false })
      .limit(200);
    if (data.country) q = q.eq("country", data.country);
    if (data.region) q = q.eq("region", data.region);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listActiveListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("market_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("market_listings")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("market_listings")
      .insert({ ...data, user_id: context.userId, status: "active" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listingSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("market_listings")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("market_listings")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markListingSold = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("market_listings")
      .update({ status: "sold" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revealContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Throttle: count today's reveals
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count, error: cErr } = await context.supabase
      .from("contact_reveals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("revealed_at", since.toISOString());
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) >= DAILY_REVEAL_CAP) {
      throw new Error(`Daily reveal limit reached (${DAILY_REVEAL_CAP}/day)`);
    }

    const { error: rErr } = await context.supabase
      .from("contact_reveals")
      .insert({ user_id: context.userId, listing_id: data.listing_id });
    if (rErr) throw new Error(rErr.message);

    const { data: listing, error: lErr } = await context.supabase
      .from("market_listings")
      .select("contact_phone")
      .eq("id", data.listing_id)
      .eq("status", "active")
      .single();
    if (lErr) throw new Error(lErr.message);
    return { contact_phone: listing.contact_phone as string, remaining: DAILY_REVEAL_CAP - (count ?? 0) - 1 };
  });

export const reportListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ listing_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Soft-flag: hide pending admin review by marking status='hidden' is too harsh.
    // Use moderated_at/moderated_by as a "reported" signal for admin moderation queue.
    const { error } = await context.supabase
      .from("market_listings")
      .update({ moderated_at: new Date().toISOString(), moderated_by: context.userId })
      .eq("id", data.listing_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getImageSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("farmhelper-images")
      .createSignedUrl(data.path, 3600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

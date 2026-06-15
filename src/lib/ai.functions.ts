import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const langSchema = z.enum(["en", "bn"]).optional();

const regionCtx = z.object({
  country: z.string().trim().length(2).nullable().optional(),
  region: z.string().trim().max(80).nullable().optional(),
  currency: z.string().trim().min(2).max(8).default("USD"),
  language: langSchema,
});

// ---------- Crop Doctor ----------
export const cropDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        crop_name: z.string().trim().min(1).max(80),
        symptoms: z.string().trim().min(3).max(2000),
        image_path: z.string().trim().min(1).max(300),
      })
      .merge(regionCtx)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { enforceDailyQuota, callAiJSON, effectiveLanguage, AiGatewayError } =
      await import("./ai.server");
    try {
      await enforceDailyQuota(context.supabase, context.userId);
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }

    const lang = data.language ?? effectiveLanguage(data.country ?? null, null);
    const langInstr = lang === "bn" ? "Bangla (Bengali)" : "English";

    const system = `You are an expert agronomist for smallholder farmers. The user has uploaded a photo of a sick/affected crop. Base your diagnosis PRIMARILY on the visual evidence in the image. Use the typed symptoms only as supporting context. Respond ONLY with valid JSON matching:
{"disease_name":string,"cause":string,"organic_treatment":string,"chemical_treatment":string,"dosage":string,"prevention":string,"confidence":number}
Write all text fields in ${langInstr}. Confidence is 0..1 and must reflect how clearly the image supports the diagnosis.`;

    const { data: signed, error: signErr } = await context.supabase.storage
      .from("farmhelper-images")
      .createSignedUrl(data.image_path, 600);
    if (signErr || !signed?.signedUrl) throw new Error("Could not read uploaded image. Please retry.");
    const imageUrl = signed.signedUrl;

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    > = [
      {
        type: "text",
        text: `Crop: ${data.crop_name}\nRegion: ${data.region ?? "unknown"}, ${data.country ?? "unknown"}\nFarmer-reported symptoms: ${data.symptoms}\n\nAnalyze the attached photo and diagnose.`,
      },
      { type: "image_url", image_url: { url: imageUrl } },
    ];

    try {
      const result = await callAiJSON<{
        disease_name: string;
        cause: string;
        organic_treatment: string;
        chemical_treatment: string;
        dosage: string;
        prevention: string;
        confidence: number;
      }>({ system, user: userContent });

      const { data: row, error } = await context.supabase
        .from("diagnoses")
        .insert({
          user_id: context.userId,
          crop_name: data.crop_name,
          symptoms: data.symptoms,
          image_path: data.image_path,
          language: lang,
          ai_result: result,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return row;
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }
  });

export const listDiagnoses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("diagnoses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Profit Planner ----------
export const profitPlanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        area: z.coerce.number().positive().max(1_000_000),
        area_unit: z.string().trim().min(1).max(20),
      })
      .merge(regionCtx)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { enforceDailyQuota, callAiJSON, effectiveLanguage, hemisphereSeason, AiGatewayError } =
      await import("./ai.server");
    try {
      await enforceDailyQuota(context.supabase, context.userId);
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }
    const lang = data.language ?? effectiveLanguage(data.country ?? null, null);
    const month = new Date().getMonth() + 1;
    const season = hemisphereSeason(data.country ?? null, month);
    const langInstr = lang === "bn" ? "Bangla (Bengali)" : "English";

    const system = `You are an agricultural economist helping smallholder farmers pick profitable crops. Respond ONLY with valid JSON of the form:
{"crops":[{"crop":string,"est_cost":number,"est_revenue":number,"est_profit":number,"demand":"low"|"medium"|"high","season_fit":"poor"|"fair"|"good"|"excellent","notes":string}]}
Return 5-8 crops ranked by est_profit desc. All money values in ${data.currency} for the whole area provided. Pick crops realistic for the region and current season. Write "crop" and "notes" in ${langInstr}.`;

    const user = `Region: ${data.region ?? "unknown"}, Country: ${data.country ?? "unknown"}
Area: ${data.area} ${data.area_unit}
Current month: ${month} (${season})
Currency: ${data.currency}`;

    try {
      const result = await callAiJSON<{
        crops: Array<{
          crop: string;
          est_cost: number;
          est_revenue: number;
          est_profit: number;
          demand: string;
          season_fit: string;
          notes: string;
        }>;
      }>({ system, user });
      const crops = Array.isArray(result.crops) ? result.crops : [];

      const { data: row, error } = await context.supabase
        .from("crop_plans")
        .insert({
          user_id: context.userId,
          country: data.country ?? null,
          region: data.region ?? null,
          season_month: month,
          language: lang,
          ai_result: { crops, currency: data.currency, area: data.area, area_unit: data.area_unit, season },
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { plan: row, crops, currency: data.currency, season };
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }
  });

// ---------- Smart Calendar (AI) ----------
export const cropCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        crop_name: z.string().trim().min(1).max(80),
        plot_id: z.string().uuid().nullable().optional(),
      })
      .merge(regionCtx)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { enforceDailyQuota, callAiJSON, effectiveLanguage, AiGatewayError } =
      await import("./ai.server");
    try {
      await enforceDailyQuota(context.supabase, context.userId);
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }
    const lang = data.language ?? effectiveLanguage(data.country ?? null, null);
    const langInstr = lang === "bn" ? "Bangla (Bengali)" : "English";

    const system = `You are an expert agronomist. For the given crop, region and current month produce a sowing-to-harvest task plan. Respond ONLY with valid JSON:
{"tasks":[{"title":string,"days_offset":number}]}
Return 6-12 actionable tasks (land prep, sowing, irrigation, fertilizing, pest scouting, harvest). days_offset is days from today (0 = today). Write titles in ${langInstr}.`;

    const user = `Crop: ${data.crop_name}
Region: ${data.region ?? "unknown"}, ${data.country ?? "unknown"}
Today: ${new Date().toISOString().slice(0, 10)}`;

    try {
      const result = await callAiJSON<{ tasks: Array<{ title: string; days_offset: number }> }>({
        system,
        user,
      });
      const tasks = Array.isArray(result.tasks) ? result.tasks : [];
      if (tasks.length === 0) throw new Error("AI returned no tasks. Please retry.");

      const today = new Date();
      const rows = tasks.slice(0, 20).map((t) => {
        const d = new Date(today);
        d.setDate(d.getDate() + Math.max(0, Math.min(365, Number(t.days_offset) || 0)));
        return {
          user_id: context.userId,
          title: String(t.title).slice(0, 120),
          due_date: d.toISOString().slice(0, 10),
          plot_id: data.plot_id ?? null,
          source: "ai" as const,
        };
      });

      const { error } = await context.supabase.from("calendar_tasks").insert(rows);
      if (error) throw new Error(error.message);
      return { inserted: rows.length };
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }
  });

// ---------- Sell Advisor ----------
export const sellAdvisor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        crop_name: z.string().trim().min(1).max(80),
        current_price: z.coerce.number().nonnegative(),
        unit: z.string().trim().max(20).default("kg"),
        trend: z.coerce.number().default(0),
      })
      .merge(regionCtx)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { enforceDailyQuota, callAiText, effectiveLanguage, AiGatewayError } =
      await import("./ai.server");
    try {
      await enforceDailyQuota(context.supabase, context.userId);
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }
    const lang = data.language ?? effectiveLanguage(data.country ?? null, null);
    const langInstr = lang === "bn" ? "Bangla (Bengali)" : "English";

    const system = `You are a market advisor for smallholder farmers. Give concise 2-4 sentence advice in ${langInstr} on whether to SELL NOW or HOLD, with reasoning. Be practical.`;
    const user = `Crop: ${data.crop_name}
Region: ${data.region ?? "unknown"}, ${data.country ?? "unknown"}
Current price: ${data.current_price} ${data.currency}/${data.unit}
Recent trend (price delta vs previous): ${data.trend}`;

    try {
      const text = await callAiText({ system, user });
      return { advice: text.trim() };
    } catch (e) {
      if (e instanceof AiGatewayError) throw new Error(e.userMessage);
      throw e;
    }
  });

// ---------- Community ----------
export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("community_posts")
      .select("*")
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listReplies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ post_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("community_replies")
      .select("*")
      .eq("post_id", data.post_id)
      .eq("status", "visible")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        title: z.string().trim().min(3).max(200),
        body: z.string().trim().min(3).max(4000),
      })
      .merge(regionCtx)
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { enforceDailyQuota, callAiText, effectiveLanguage, AiGatewayError } =
      await import("./ai.server");
    const lang = data.language ?? effectiveLanguage(data.country ?? null, null);

    let aiAnswer: string | null = null;
    try {
      await enforceDailyQuota(context.supabase, context.userId);
      const langInstr = lang === "bn" ? "Bangla (Bengali)" : "English";
      aiAnswer = await callAiText({
        system: `You are a helpful farming assistant. Answer the question concisely (3-6 sentences) in ${langInstr}.`,
        user: `Region: ${data.region ?? "unknown"}, ${data.country ?? "unknown"}\nTitle: ${data.title}\nQuestion: ${data.body}`,
      });
    } catch (e) {
      // Fallback: post without AI answer
      aiAnswer = null;
      if (!(e instanceof AiGatewayError)) console.error("communityAnswer failed", e);
    }

    const { data: row, error } = await context.supabase
      .from("community_posts")
      .insert({
        user_id: context.userId,
        title: data.title,
        body: data.body,
        language: lang,
        ai_answer: aiAnswer,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      post_id: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("community_replies")
      .insert({
        user_id: context.userId,
        post_id: data.post_id,
        body: data.body,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

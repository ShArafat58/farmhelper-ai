// Server-only helpers for Lovable AI Gateway.
// Do not import from client modules. Imported only from *.functions.ts handlers.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-3-flash-preview";

export class AiGatewayError extends Error {
  status: number;
  userMessage: string;
  constructor(status: number, msg: string, userMessage: string) {
    super(msg);
    this.status = status;
    this.userMessage = userMessage;
  }
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

export async function callAiJSON<T = unknown>(opts: {
  system: string;
  user: ChatMessage["content"];
  model?: string;
}): Promise<T> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiGatewayError(500, "Missing LOVABLE_API_KEY", "AI is not configured.");

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ] as ChatMessage[],
    response_format: { type: "json_object" as const },
  };

  let resp: Response;
  try {
    resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new AiGatewayError(0, String(e), "AI request failed. Please retry.");
  }

  if (resp.status === 429) throw new AiGatewayError(429, "rate limit", "AI is busy, please retry shortly.");
  if (resp.status === 402) throw new AiGatewayError(402, "credits", "AI temporarily unavailable.");
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new AiGatewayError(resp.status, text, "AI request failed. Please retry.");
  }

  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  try {
    // Strip ```json fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AiGatewayError(500, `bad json: ${raw.slice(0, 200)}`, "AI returned an invalid response. Please retry.");
  }
}

export async function callAiText(opts: {
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new AiGatewayError(500, "Missing LOVABLE_API_KEY", "AI is not configured.");
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (resp.status === 429) throw new AiGatewayError(429, "rate limit", "AI is busy, please retry shortly.");
  if (resp.status === 402) throw new AiGatewayError(402, "credits", "AI temporarily unavailable.");
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new AiGatewayError(resp.status, text, "AI request failed. Please retry.");
  }
  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
}

export const DAILY_AI_CAP = 30;

/**
 * Enforce per-user daily AI quota. Increments the counter on success.
 * Pass an authenticated supabase client (RLS scoped to the user).
 */
export async function enforceDailyQuota(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing, error: selErr } = await supabase
    .from("ai_usage_daily")
    .select("id, count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);

  const used = existing?.count ?? 0;
  if (used >= DAILY_AI_CAP) {
    throw new AiGatewayError(
      429,
      "quota",
      `Daily AI limit reached (${DAILY_AI_CAP}/day). Try again tomorrow.`,
    );
  }

  if (existing) {
    const { error } = await supabase
      .from("ai_usage_daily")
      .update({ count: used + 1 })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("ai_usage_daily")
      .insert({ user_id: userId, date: today, count: 1 });
    if (error) throw new Error(error.message);
  }
}

export function effectiveLanguage(country: string | null, preferred: string | null): "en" | "bn" {
  return country === "BD" && preferred === "bn" ? "bn" : "en";
}

export function hemisphereSeason(country: string | null, month: number): string {
  // Crude hemisphere bucket; AI uses month+country anyway, this is hinting only.
  const south = new Set(["AU", "NZ", "AR", "CL", "BR", "ZA", "PE", "UY", "PY", "BO"]);
  const isSouth = country ? south.has(country) : false;
  const m = isSouth ? ((month + 5) % 12) + 1 : month;
  if (m >= 3 && m <= 5) return "Spring";
  if (m >= 6 && m <= 8) return "Summer";
  if (m >= 9 && m <= 11) return "Autumn";
  return "Winter";
}

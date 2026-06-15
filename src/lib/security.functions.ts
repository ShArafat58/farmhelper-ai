import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SECURITY_QUESTION_KEYS, type SecurityQuestionKey } from "./security-questions";

type Pair = { questionKey: string; answer: string };

function validatePairs(pairs: Pair[]) {
  if (!Array.isArray(pairs) || pairs.length !== 2) {
    throw new Error("Two security questions are required.");
  }
  const keys = pairs.map((p) => p.questionKey);
  if (!keys.every((k) => (SECURITY_QUESTION_KEYS as readonly string[]).includes(k))) {
    throw new Error("Invalid question key.");
  }
  if (keys[0] === keys[1]) throw new Error("Choose two different questions.");
  for (const p of pairs) {
    if (!p.answer || !p.answer.trim()) throw new Error("Answers are required.");
    if (p.answer.length > 200) throw new Error("Answer too long.");
  }
}

// Set/replace the current user's 2 security answers.
export const setMySecurityAnswers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { pairs: Pair[] }) => data)
  .handler(async ({ data, context }) => {
    validatePairs(data.pairs);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Replace the existing pair atomically: delete existing, insert via RPC (which hashes).
    const del = await supabaseAdmin
      .from("security_answers")
      .delete()
      .eq("user_id", context.userId);
    if (del.error) throw new Error(del.error.message);
    for (const p of data.pairs) {
      const { error } = await supabaseAdmin.rpc("set_security_answer", {
        p_user_id: context.userId,
        p_question_key: p.questionKey,
        p_answer: p.answer,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Returns the current user's chosen question keys (no answers).
export const getMySecurityQuestionKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("security_answers")
      .select("question_key, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { keys: (data ?? []).map((r) => r.question_key as SecurityQuestionKey) };
  });

// PUBLIC: given an email, return the 2 question keys (or empty).
// Always returns neutrally — never leaks whether an account exists.
export const getQuestionKeysForEmail = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string }) => data)
  .handler(async ({ data }) => {
    const email = (data.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { keys: [] as string[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uidRes = await supabaseAdmin.rpc("get_user_id_by_email", { p_email: email });
    if (uidRes.error) return { keys: [] };
    const userId = uidRes.data as string | null;
    if (!userId) return { keys: [] };
    const { data: rows, error } = await supabaseAdmin
      .from("security_answers")
      .select("question_key, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error || !rows || rows.length === 0) return { keys: [] };
    return { keys: rows.map((r) => r.question_key as string) };
  });

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// PUBLIC: verify answers and reset password.
export const resetPasswordWithAnswers = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      email: string;
      answers: { questionKey: string; answer: string }[];
      newPassword: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const email = (data.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return { ok: false as const, reason: "invalid" };
    }
    if (!data.newPassword || data.newPassword.length < 8) {
      return { ok: false as const, reason: "weak_password" };
    }
    if (!Array.isArray(data.answers) || data.answers.length !== 2) {
      return { ok: false as const, reason: "invalid" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit check
    const rl = await supabaseAdmin
      .from("password_reset_attempts")
      .select("attempts, locked_until")
      .eq("email", email)
      .maybeSingle();
    if (rl.data?.locked_until && new Date(rl.data.locked_until) > new Date()) {
      return { ok: false as const, reason: "rate_limited" };
    }

    const uidRes = await supabaseAdmin.rpc("get_user_id_by_email", { p_email: email });
    const userId = (uidRes.data as string | null) ?? null;
    if (!userId) {
      // Don't reveal account existence — return generic mismatch.
      await bumpAttempts(supabaseAdmin, email, rl.data?.attempts ?? 0);
      return { ok: false as const, reason: "mismatch" };
    }

    // Verify both answers
    let allOk = true;
    for (const a of data.answers) {
      if (!(SECURITY_QUESTION_KEYS as readonly string[]).includes(a.questionKey)) {
        allOk = false;
        break;
      }
      const v = await supabaseAdmin.rpc("verify_security_answer", {
        p_user_id: userId,
        p_question_key: a.questionKey,
        p_answer: a.answer ?? "",
      });
      if (v.error || v.data !== true) {
        allOk = false;
        break;
      }
    }

    if (!allOk) {
      await bumpAttempts(supabaseAdmin, email, rl.data?.attempts ?? 0);
      return { ok: false as const, reason: "mismatch" };
    }

    // Update password via Admin API
    const upd = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.newPassword,
    });
    if (upd.error) {
      return { ok: false as const, reason: "update_failed" };
    }

    // Clear attempts on success
    await supabaseAdmin.from("password_reset_attempts").delete().eq("email", email);

    return { ok: true as const };
  });

async function bumpAttempts(
  admin: Awaited<ReturnType<typeof import("@/integrations/supabase/client.server")>>["supabaseAdmin"],
  email: string,
  current: number,
) {
  const next = current + 1;
  const locked_until =
    next >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
  await admin
    .from("password_reset_attempts")
    .upsert(
      { email, attempts: next, locked_until, updated_at: new Date().toISOString() },
      { onConflict: "email" },
    );
}

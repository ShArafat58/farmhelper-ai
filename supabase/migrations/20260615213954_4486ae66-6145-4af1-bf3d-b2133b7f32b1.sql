
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- security_answers table
CREATE TABLE public.security_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_answers TO authenticated;
GRANT ALL ON public.security_answers TO service_role;

ALTER TABLE public.security_answers ENABLE ROW LEVEL SECURITY;

-- Owner-only access. Selecting still returns answer_hash to the owner — but
-- the client never needs it; server reset flow uses service_role.
CREATE POLICY "Users select own security_answers"
  ON public.security_answers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own security_answers"
  ON public.security_answers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own security_answers"
  ON public.security_answers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own security_answers"
  ON public.security_answers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_security_answers_updated_at
  BEFORE UPDATE ON public.security_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- password_reset_attempts: rate-limit reset guesses per email
CREATE TABLE public.password_reset_attempts (
  email TEXT NOT NULL PRIMARY KEY,
  attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.password_reset_attempts TO service_role;
ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role accesses this table.

-- Helper functions (SECURITY DEFINER) used only by server (service_role) code.

-- Look up a user id by email (case-insensitive). Returns null if not found.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(p_email) LIMIT 1;
$$;

-- Return question keys for a user (no answers).
CREATE OR REPLACE FUNCTION public.get_security_question_keys(p_user_id UUID)
RETURNS TABLE(question_key TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT question_key FROM public.security_answers
   WHERE user_id = p_user_id ORDER BY created_at ASC;
$$;

-- Verify a normalized answer (compare lower(trim(answer)) against bcrypt hash).
CREATE OR REPLACE FUNCTION public.verify_security_answer(
  p_user_id UUID, p_question_key TEXT, p_answer TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_norm TEXT := lower(btrim(p_answer));
BEGIN
  SELECT answer_hash INTO v_hash
    FROM public.security_answers
   WHERE user_id = p_user_id AND question_key = p_question_key;
  IF v_hash IS NULL THEN RETURN FALSE; END IF;
  RETURN v_hash = crypt(v_norm, v_hash);
END;
$$;

-- Upsert a security answer (server-side hashing with bcrypt).
CREATE OR REPLACE FUNCTION public.set_security_answer(
  p_user_id UUID, p_question_key TEXT, p_answer TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT := lower(btrim(p_answer));
  v_hash TEXT;
BEGIN
  IF v_norm = '' THEN RAISE EXCEPTION 'answer required'; END IF;
  v_hash := crypt(v_norm, gen_salt('bf', 10));
  INSERT INTO public.security_answers(user_id, question_key, answer_hash)
    VALUES (p_user_id, p_question_key, v_hash)
  ON CONFLICT (user_id, question_key)
    DO UPDATE SET answer_hash = EXCLUDED.answer_hash, updated_at = now();
END;
$$;

-- Revoke default execute from PUBLIC; only service_role should invoke.
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_security_question_keys(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_security_answer(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_security_answer(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_security_question_keys(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_security_answer(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_security_answer(UUID, TEXT, TEXT) TO service_role;
-- Authenticated users may set their own answers from the client too (via RLS-bound RPC call):
GRANT EXECUTE ON FUNCTION public.set_security_answer(UUID, TEXT, TEXT) TO authenticated;


-- ENUMS
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('user','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.listing_status AS ENUM ('active','sold','hidden','removed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.content_status AS ENUM ('visible','hidden'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_status AS ENUM ('pending','done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_source AS ENUM ('manual','ai'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PROFILES extend
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS area_unit TEXT NOT NULL DEFAULT 'acre',
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS krishi_score INT NOT NULL DEFAULT 0;

-- USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;
CREATE POLICY "Admin manages roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- signup trigger (extend to add default 'user' role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_country TEXT := NULLIF(meta->>'country','');
  v_lang TEXT := NULLIF(meta->>'preferred_language','');
BEGIN
  INSERT INTO public.profiles (id, full_name, country, preferred_language)
  VALUES (NEW.id, NULLIF(meta->>'full_name',''), v_country,
    CASE WHEN v_country='BD' THEN COALESCE(v_lang,'bn') ELSE 'en' END)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS "Admin views all profiles" ON public.profiles;
CREATE POLICY "Admin views all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- FARM PLOTS
CREATE TABLE IF NOT EXISTS public.farm_plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, area NUMERIC, crop_name TEXT, country TEXT, region TEXT,
  planted_at DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farm_plots TO authenticated;
GRANT ALL ON public.farm_plots TO service_role;
ALTER TABLE public.farm_plots ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_farm_plots_user ON public.farm_plots(user_id);
DROP POLICY IF EXISTS "Owner manages plots" ON public.farm_plots;
CREATE POLICY "Owner manages plots" ON public.farm_plots FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin reads plots" ON public.farm_plots;
CREATE POLICY "Admin reads plots" ON public.farm_plots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- CALENDAR TASKS
CREATE TABLE IF NOT EXISTS public.calendar_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plot_id UUID REFERENCES public.farm_plots(id) ON DELETE SET NULL,
  title TEXT NOT NULL, due_date DATE,
  status public.task_status NOT NULL DEFAULT 'pending',
  source public.task_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_tasks TO authenticated;
GRANT ALL ON public.calendar_tasks TO service_role;
ALTER TABLE public.calendar_tasks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_calendar_tasks_user ON public.calendar_tasks(user_id);
DROP POLICY IF EXISTS "Owner manages tasks" ON public.calendar_tasks;
CREATE POLICY "Owner manages tasks" ON public.calendar_tasks FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin reads tasks" ON public.calendar_tasks;
CREATE POLICY "Admin reads tasks" ON public.calendar_tasks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- DIAGNOSES
CREATE TABLE IF NOT EXISTS public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_name TEXT, image_path TEXT, symptoms TEXT, ai_result JSONB, language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnoses TO authenticated;
GRANT ALL ON public.diagnoses TO service_role;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_diagnoses_user ON public.diagnoses(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_created ON public.diagnoses(created_at DESC);
DROP POLICY IF EXISTS "Owner manages diagnoses" ON public.diagnoses;
CREATE POLICY "Owner manages diagnoses" ON public.diagnoses FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin reads diagnoses" ON public.diagnoses;
CREATE POLICY "Admin reads diagnoses" ON public.diagnoses FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- CROP PLANS
CREATE TABLE IF NOT EXISTS public.crop_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country TEXT, region TEXT, season_month INT, ai_result JSONB, language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_plans TO authenticated;
GRANT ALL ON public.crop_plans TO service_role;
ALTER TABLE public.crop_plans ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_crop_plans_user ON public.crop_plans(user_id);
DROP POLICY IF EXISTS "Owner manages crop plans" ON public.crop_plans;
CREATE POLICY "Owner manages crop plans" ON public.crop_plans FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin reads crop plans" ON public.crop_plans;
CREATE POLICY "Admin reads crop plans" ON public.crop_plans FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- MARKET LISTINGS
CREATE TABLE IF NOT EXISTS public.market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  country TEXT, region TEXT, crop_name TEXT NOT NULL,
  qty NUMERIC, unit TEXT, price NUMERIC, currency TEXT,
  image_path TEXT, contact_phone TEXT,
  status public.listing_status NOT NULL DEFAULT 'active',
  moderated_by UUID REFERENCES auth.users(id), moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_listings TO authenticated;
GRANT ALL ON public.market_listings TO service_role;
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_market_listings_user ON public.market_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_market_listings_geo ON public.market_listings(country, region);
CREATE INDEX IF NOT EXISTS idx_market_listings_created ON public.market_listings(created_at DESC);
DROP POLICY IF EXISTS "Read active or own listings" ON public.market_listings;
CREATE POLICY "Read active or own listings" ON public.market_listings FOR SELECT TO authenticated USING (status='active' OR auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Owner inserts listings" ON public.market_listings;
CREATE POLICY "Owner inserts listings" ON public.market_listings FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Owner updates listings" ON public.market_listings;
CREATE POLICY "Owner updates listings" ON public.market_listings FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Owner deletes listings" ON public.market_listings;
CREATE POLICY "Owner deletes listings" ON public.market_listings FOR DELETE TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin moderates listings" ON public.market_listings;
CREATE POLICY "Admin moderates listings" ON public.market_listings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- MARKET PRICES
CREATE TABLE IF NOT EXISTS public.market_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL, region TEXT, crop_name TEXT NOT NULL,
  price NUMERIC NOT NULL, currency TEXT NOT NULL, unit TEXT NOT NULL,
  as_of DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.market_prices TO authenticated;
GRANT ALL ON public.market_prices TO service_role;
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_market_prices_lookup ON public.market_prices(country, region, crop_name);
DROP POLICY IF EXISTS "All authenticated read prices" ON public.market_prices;
CREATE POLICY "All authenticated read prices" ON public.market_prices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin writes prices" ON public.market_prices;
CREATE POLICY "Admin writes prices" ON public.market_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COMMUNITY POSTS
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, body TEXT NOT NULL, language TEXT, ai_answer TEXT,
  status public.content_status NOT NULL DEFAULT 'visible',
  moderated_by UUID REFERENCES auth.users(id), moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.community_posts(created_at DESC);
DROP POLICY IF EXISTS "Read visible or own posts" ON public.community_posts;
CREATE POLICY "Read visible or own posts" ON public.community_posts FOR SELECT TO authenticated USING (status='visible' OR auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Owner inserts posts" ON public.community_posts;
CREATE POLICY "Owner inserts posts" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Owner updates posts" ON public.community_posts;
CREATE POLICY "Owner updates posts" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Owner deletes posts" ON public.community_posts;
CREATE POLICY "Owner deletes posts" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin moderates posts" ON public.community_posts;
CREATE POLICY "Admin moderates posts" ON public.community_posts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COMMUNITY REPLIES
CREATE TABLE IF NOT EXISTS public.community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL, is_ai BOOLEAN NOT NULL DEFAULT false, language TEXT,
  status public.content_status NOT NULL DEFAULT 'visible',
  moderated_by UUID REFERENCES auth.users(id), moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_replies TO authenticated;
GRANT ALL ON public.community_replies TO service_role;
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_replies_post ON public.community_replies(post_id);
DROP POLICY IF EXISTS "Read visible or own replies" ON public.community_replies;
CREATE POLICY "Read visible or own replies" ON public.community_replies FOR SELECT TO authenticated USING (status='visible' OR auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Owner inserts replies" ON public.community_replies;
CREATE POLICY "Owner inserts replies" ON public.community_replies FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Owner updates replies" ON public.community_replies;
CREATE POLICY "Owner updates replies" ON public.community_replies FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Owner deletes replies" ON public.community_replies;
CREATE POLICY "Owner deletes replies" ON public.community_replies FOR DELETE TO authenticated USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin moderates replies" ON public.community_replies;
CREATE POLICY "Admin moderates replies" ON public.community_replies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- BADGES
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_badges_user ON public.badges(user_id);
DROP POLICY IF EXISTS "Owner reads badges" ON public.badges;
CREATE POLICY "Owner reads badges" ON public.badges FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- AI USAGE
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INT NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_usage_daily TO authenticated;
GRANT ALL ON public.ai_usage_daily TO service_role;
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_aiu_user ON public.ai_usage_daily(user_id);
DROP POLICY IF EXISTS "Owner reads usage" ON public.ai_usage_daily;
CREATE POLICY "Owner reads usage" ON public.ai_usage_daily FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));

-- CONTACT REVEALS
CREATE TABLE IF NOT EXISTS public.contact_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.market_listings(id) ON DELETE CASCADE,
  revealed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_reveals TO authenticated;
GRANT ALL ON public.contact_reveals TO service_role;
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cr_user ON public.contact_reveals(user_id);
DROP POLICY IF EXISTS "Owner manages reveals" ON public.contact_reveals;
CREATE POLICY "Owner manages reveals" ON public.contact_reveals FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "Admin reads reveals" ON public.contact_reveals;
CREATE POLICY "Admin reads reveals" ON public.contact_reveals FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- SCORING
CREATE OR REPLACE FUNCTION public.award_badge(_user_id UUID, _code TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.badges(user_id, code) VALUES (_user_id, _code) ON CONFLICT (user_id, code) DO NOTHING; END; $$;

CREATE OR REPLACE FUNCTION public.bump_score(_user_id UUID, _delta INT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_score INT;
BEGIN
  UPDATE public.profiles SET krishi_score = krishi_score + _delta WHERE id=_user_id RETURNING krishi_score INTO new_score;
  IF new_score >= 100 THEN PERFORM public.award_badge(_user_id,'green_thumb'); END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.trg_diagnosis_score() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bump_score(NEW.user_id,15); PERFORM public.award_badge(NEW.user_id,'first_diagnosis'); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_diagnosis_score ON public.diagnoses;
CREATE TRIGGER trg_diagnosis_score AFTER INSERT ON public.diagnoses FOR EACH ROW EXECUTE FUNCTION public.trg_diagnosis_score();

CREATE OR REPLACE FUNCTION public.trg_crop_plan_score() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bump_score(NEW.user_id,20); PERFORM public.award_badge(NEW.user_id,'planner'); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_crop_plan_score ON public.crop_plans;
CREATE TRIGGER trg_crop_plan_score AFTER INSERT ON public.crop_plans FOR EACH ROW EXECUTE FUNCTION public.trg_crop_plan_score();

CREATE OR REPLACE FUNCTION public.trg_listing_score() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.status='active' THEN PERFORM public.bump_score(NEW.user_id,10); PERFORM public.award_badge(NEW.user_id,'seller'); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_listing_score ON public.market_listings;
CREATE TRIGGER trg_listing_score AFTER INSERT ON public.market_listings FOR EACH ROW EXECUTE FUNCTION public.trg_listing_score();

CREATE OR REPLACE FUNCTION public.trg_post_score() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bump_score(NEW.user_id,8); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_post_score ON public.community_posts;
CREATE TRIGGER trg_post_score AFTER INSERT ON public.community_posts FOR EACH ROW EXECUTE FUNCTION public.trg_post_score();

CREATE OR REPLACE FUNCTION public.trg_task_done_score() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NEW.status='done' AND (OLD.status IS DISTINCT FROM 'done') THEN PERFORM public.bump_score(NEW.user_id,2); END IF; RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_task_done_score ON public.calendar_tasks;
CREATE TRIGGER trg_task_done_score AFTER UPDATE ON public.calendar_tasks FOR EACH ROW EXECUTE FUNCTION public.trg_task_done_score();

-- STORAGE OBJECT POLICIES (bucket created via storage tool)
DROP POLICY IF EXISTS "fh_images_read_own" ON storage.objects;
CREATE POLICY "fh_images_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='farmhelper-images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "fh_images_insert_own" ON storage.objects;
CREATE POLICY "fh_images_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='farmhelper-images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "fh_images_update_own" ON storage.objects;
CREATE POLICY "fh_images_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='farmhelper-images' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "fh_images_delete_own" ON storage.objects;
CREATE POLICY "fh_images_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='farmhelper-images' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('follower', 'leader', 'admin');
CREATE TYPE public.protest_status AS ENUM ('upcoming', 'active', 'ended', 'cancelled');
CREATE TYPE public.attendance_status AS ENUM ('interested', 'going');
CREATE TYPE public.subscription_status AS ENUM ('inactive', 'trialing', 'active', 'past_due', 'cancelled');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_owner_upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ LEADER SUBSCRIPTIONS ============
CREATE TABLE public.leader_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status subscription_status NOT NULL DEFAULT 'inactive',
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leader_subscriptions TO authenticated;
GRANT ALL ON public.leader_subscriptions TO service_role;
ALTER TABLE public.leader_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_self_read" ON public.leader_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ PROTESTS ============
CREATE TABLE public.protests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_html TEXT NOT NULL DEFAULT '',
  cause_tags TEXT[] NOT NULL DEFAULT '{}',
  country_code TEXT NOT NULL,
  region TEXT,
  city TEXT,
  location_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  intensity SMALLINT NOT NULL DEFAULT 1 CHECK (intensity BETWEEN 1 AND 5),
  status protest_status NOT NULL DEFAULT 'upcoming',
  verified BOOLEAN NOT NULL DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX protests_country_idx ON public.protests(country_code);
CREATE INDEX protests_status_idx ON public.protests(status);
CREATE INDEX protests_start_at_idx ON public.protests(start_at DESC);
GRANT SELECT ON public.protests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protests TO authenticated;
GRANT ALL ON public.protests TO service_role;
ALTER TABLE public.protests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "protests_public_read" ON public.protests FOR SELECT USING (true);
CREATE POLICY "protests_leader_insert" ON public.protests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = leader_id AND public.has_role(auth.uid(), 'leader'));
CREATE POLICY "protests_owner_update" ON public.protests FOR UPDATE TO authenticated
  USING (auth.uid() = leader_id) WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "protests_owner_delete" ON public.protests FOR DELETE TO authenticated
  USING (auth.uid() = leader_id);

-- ============ ATTENDEES ============
CREATE TABLE public.protest_attendees (
  protest_id UUID NOT NULL REFERENCES public.protests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'interested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (protest_id, user_id)
);
GRANT SELECT ON public.protest_attendees TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.protest_attendees TO authenticated;
GRANT ALL ON public.protest_attendees TO service_role;
ALTER TABLE public.protest_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att_public_read" ON public.protest_attendees FOR SELECT USING (true);
CREATE POLICY "att_self_write" ON public.protest_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "att_self_update" ON public.protest_attendees FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "att_self_delete" ON public.protest_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ POSTS ============
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protest_id UUID REFERENCES public.protests(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX posts_author_idx ON public.posts(author_id);
CREATE INDEX posts_protest_idx ON public.posts(protest_id);
GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT USING (true);
CREATE POLICY "posts_self_insert" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "posts_self_update" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "posts_self_delete" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- ============ COMMENTS ============
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_idx ON public.comments(post_id);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_public_read" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_self_insert" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_self_delete" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- ============ POST REACTIONS ============
CREATE TABLE public.post_reactions (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'up',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.post_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_reactions TO authenticated;
GRANT ALL ON public.post_reactions TO service_role;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_public_read" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_self_write" ON public.post_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_self_delete" ON public.post_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ FOLLOWS ============
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, leader_id)
);
GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_public_read" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_self_write" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_self_delete" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ============ NEWS ARTICLES ============
CREATE TABLE public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_id TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT,
  image_url TEXT,
  country_code TEXT,
  cause_tags TEXT[] NOT NULL DEFAULT '{}',
  protest_id UUID REFERENCES public.protests(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, external_id)
);
CREATE INDEX news_country_idx ON public.news_articles(country_code);
CREATE INDEX news_published_idx ON public.news_articles(published_at DESC);
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news_public_read" ON public.news_articles FOR SELECT USING (true);

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notif_user_idx ON public.notifications(user_id, read_at);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_self_read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_self_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ COUNTRY STATS VIEW ============
CREATE VIEW public.country_stats AS
  SELECT
    country_code,
    COUNT(*) FILTER (WHERE status IN ('upcoming', 'active')) AS active_count,
    COALESCE(AVG(intensity) FILTER (WHERE status IN ('upcoming', 'active')), 0)::NUMERIC(3,2) AS avg_intensity,
    LEAST(5, GREATEST(0,
      CASE
        WHEN COUNT(*) FILTER (WHERE status IN ('upcoming','active')) = 0 THEN 0
        WHEN COUNT(*) FILTER (WHERE status IN ('upcoming','active')) < 3 THEN 1
        WHEN COUNT(*) FILTER (WHERE status IN ('upcoming','active')) < 8 THEN 2
        WHEN COUNT(*) FILTER (WHERE status IN ('upcoming','active')) < 20 THEN 3
        WHEN COUNT(*) FILTER (WHERE status IN ('upcoming','active')) < 50 THEN 4
        ELSE 5
      END
    ))::INT AS color_bucket
  FROM public.protests
  GROUP BY country_code;
GRANT SELECT ON public.country_stats TO anon, authenticated;

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_protests_updated BEFORE UPDATE ON public.protests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.leader_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROFILE + DEFAULT ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'follower');
  INSERT INTO public.leader_subscriptions (user_id, status) VALUES (NEW.id, 'inactive');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

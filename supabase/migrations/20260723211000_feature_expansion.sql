-- ============ FEATURE EXPANSION MIGRATION ============
-- Adds: political parties, chat system, comment threading, 
--        enriched protest details, pinning system

-- ============ NEW ENUMS ============
CREATE TYPE public.party_member_role AS ENUM ('supporter', 'admin');
CREATE TYPE public.channel_type AS ENUM ('announcements', 'general');
CREATE TYPE public.entity_type AS ENUM ('protest', 'party');

-- ============ POLITICAL PARTIES ============
CREATE TABLE public.political_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description_html TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  ideology TEXT,
  founding_date DATE,
  country_code TEXT,
  website TEXT,
  supporter_count_cached INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parties_country_idx ON public.political_parties(country_code);
CREATE INDEX parties_slug_idx ON public.political_parties(slug);
GRANT SELECT ON public.political_parties TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.political_parties TO authenticated;
GRANT ALL ON public.political_parties TO service_role;
ALTER TABLE public.political_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties_public_read" ON public.political_parties FOR SELECT USING (true);
CREATE POLICY "parties_leader_insert" ON public.political_parties FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = leader_id AND public.has_role(auth.uid(), 'leader'));
CREATE POLICY "parties_owner_update" ON public.political_parties FOR UPDATE TO authenticated
  USING (auth.uid() = leader_id) WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "parties_owner_delete" ON public.political_parties FOR DELETE TO authenticated
  USING (auth.uid() = leader_id);

CREATE TRIGGER trg_parties_updated BEFORE UPDATE ON public.political_parties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PARTY MEMBERS ============
CREATE TABLE public.party_members (
  party_id UUID NOT NULL REFERENCES public.political_parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role party_member_role NOT NULL DEFAULT 'supporter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (party_id, user_id)
);
CREATE INDEX party_members_user_idx ON public.party_members(user_id);
GRANT SELECT ON public.party_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_members TO authenticated;
GRANT ALL ON public.party_members TO service_role;
ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_public_read" ON public.party_members FOR SELECT USING (true);
CREATE POLICY "pm_self_join" ON public.party_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pm_self_leave" ON public.party_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
-- Admins of a party can update roles
CREATE POLICY "pm_admin_update" ON public.party_members FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.party_members pm
      WHERE pm.party_id = party_members.party_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'admin'
    )
  );

-- ============ CHAT CHANNELS ============
CREATE TABLE public.chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  type channel_type NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, slug)
);
CREATE INDEX channels_entity_idx ON public.chat_channels(entity_type, entity_id);
GRANT SELECT ON public.chat_channels TO anon;
GRANT SELECT, INSERT ON public.chat_channels TO authenticated;
GRANT ALL ON public.chat_channels TO service_role;
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_public_read" ON public.chat_channels FOR SELECT USING (true);
CREATE POLICY "channels_auth_insert" ON public.chat_channels FOR INSERT TO authenticated WITH CHECK (true);

-- ============ CHAT MESSAGES ============
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_channel_idx ON public.chat_messages(channel_id, created_at);
CREATE INDEX messages_pinned_idx ON public.chat_messages(channel_id) WHERE is_pinned = true;
GRANT SELECT ON public.chat_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_public_read" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "msg_auth_insert" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
CREATE POLICY "msg_self_delete" ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = author_id);
CREATE POLICY "msg_self_update" ON public.chat_messages FOR UPDATE TO authenticated
  USING (auth.uid() = author_id);

-- ============ EXTEND PROTESTS WITH DETAIL FIELDS ============
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS is_peaceful BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS motto TEXT;
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS how_to_join TEXT;
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS what_to_bring TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS services_available TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS plan_of_action_html TEXT;
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS milestones JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS arrival_info TEXT;
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0;
ALTER TABLE public.protests ADD COLUMN IF NOT EXISTS personalities TEXT[] NOT NULL DEFAULT '{}';

-- ============ EXTEND POSTS WITH PINNING ============
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

-- ============ EXTEND COMMENTS WITH THREADING ============
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX comments_parent_idx ON public.comments(parent_comment_id);

-- ============ USER PINS (personal bookmarks) ============
CREATE TABLE public.user_pins (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- 'post', 'protest', 'party', 'message'
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_pins TO authenticated;
GRANT ALL ON public.user_pins TO service_role;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pins_self_read" ON public.user_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pins_self_write" ON public.user_pins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pins_self_delete" ON public.user_pins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ ENABLE REALTIME ON CHAT MESSAGES ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

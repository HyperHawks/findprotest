-- 1. Create a helper function to extract Firebase UID from JWT
CREATE OR REPLACE FUNCTION public.firebase_uid()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::text;
$$;

-- 2. Drop existing foreign keys to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.leader_subscriptions DROP CONSTRAINT IF EXISTS leader_subscriptions_user_id_fkey;
ALTER TABLE public.protests DROP CONSTRAINT IF EXISTS protests_leader_id_fkey;
ALTER TABLE public.protest_attendees DROP CONSTRAINT IF EXISTS protest_attendees_user_id_fkey;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_pinned_by_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_author_id_fkey;
ALTER TABLE public.post_reactions DROP CONSTRAINT IF EXISTS post_reactions_user_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE public.follows DROP CONSTRAINT IF EXISTS follows_leader_id_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.political_parties DROP CONSTRAINT IF EXISTS political_parties_leader_id_fkey;
ALTER TABLE public.party_members DROP CONSTRAINT IF EXISTS party_members_user_id_fkey;
ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_author_id_fkey;
ALTER TABLE public.user_pins DROP CONSTRAINT IF EXISTS user_pins_user_id_fkey;

-- 3. Drop existing RLS policies that rely on auth.uid() (so we can alter types)
-- Profiles
DROP POLICY IF EXISTS "profiles_owner_upsert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_update" ON public.profiles;
-- User roles
DROP POLICY IF EXISTS "roles_self_read" ON public.user_roles;
-- Protests
DROP POLICY IF EXISTS "protests_leader_insert" ON public.protests;
DROP POLICY IF EXISTS "protests_leader_update" ON public.protests;
DROP POLICY IF EXISTS "protests_leader_delete" ON public.protests;
-- Attendees
DROP POLICY IF EXISTS "attendees_self_manage" ON public.protest_attendees;
-- Posts
DROP POLICY IF EXISTS "posts_author_insert" ON public.posts;
DROP POLICY IF EXISTS "posts_author_update" ON public.posts;
DROP POLICY IF EXISTS "posts_author_delete" ON public.posts;
-- Comments
DROP POLICY IF EXISTS "comments_author_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_author_update" ON public.comments;
DROP POLICY IF EXISTS "comments_author_delete" ON public.comments;
-- Reactions
DROP POLICY IF EXISTS "reactions_self_manage" ON public.post_reactions;
-- Follows
DROP POLICY IF EXISTS "follows_self_manage" ON public.follows;
-- Notifications
DROP POLICY IF EXISTS "notifications_self_read" ON public.notifications;
DROP POLICY IF EXISTS "notifications_self_update" ON public.notifications;
-- Parties
DROP POLICY IF EXISTS "parties_leader_insert" ON public.political_parties;
DROP POLICY IF EXISTS "parties_leader_update" ON public.political_parties;
DROP POLICY IF EXISTS "parties_leader_delete" ON public.political_parties;
-- Party Members
DROP POLICY IF EXISTS "party_members_self_manage" ON public.party_members;
-- Chat Messages
DROP POLICY IF EXISTS "chat_messages_author_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_author_update" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_author_delete" ON public.chat_messages;
-- User Pins
DROP POLICY IF EXISTS "user_pins_self_manage" ON public.user_pins;

-- Drop function has_role so we can recreate it with TEXT
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);

-- 4. Alter column types from UUID to TEXT
-- Note: CASCADE might drop indexes, which is fine, we just want to change the type.
ALTER TABLE public.profiles ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.user_roles ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.leader_subscriptions ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.protests ALTER COLUMN leader_id TYPE TEXT USING leader_id::text;
ALTER TABLE public.protest_attendees ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.posts ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE public.posts ALTER COLUMN pinned_by TYPE TEXT USING pinned_by::text;
ALTER TABLE public.comments ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE public.post_reactions ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.follows ALTER COLUMN follower_id TYPE TEXT USING follower_id::text;
ALTER TABLE public.follows ALTER COLUMN leader_id TYPE TEXT USING leader_id::text;
ALTER TABLE public.notifications ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.political_parties ALTER COLUMN leader_id TYPE TEXT USING leader_id::text;
ALTER TABLE public.party_members ALTER COLUMN user_id TYPE TEXT USING user_id::text;
ALTER TABLE public.chat_messages ALTER COLUMN author_id TYPE TEXT USING author_id::text;
ALTER TABLE public.user_pins ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 5. Recreate foreign keys (pointing to public.profiles instead of auth.users)
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.leader_subscriptions ADD CONSTRAINT leader_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.protests ADD CONSTRAINT protests_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.protest_attendees ADD CONSTRAINT protest_attendees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD CONSTRAINT posts_pinned_by_fkey FOREIGN KEY (pinned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.comments ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.post_reactions ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.follows ADD CONSTRAINT follows_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.political_parties ADD CONSTRAINT political_parties_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.party_members ADD CONSTRAINT party_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_pins ADD CONSTRAINT user_pins_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 6. Recreate function
CREATE OR REPLACE FUNCTION public.has_role(_user_id TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 7. Recreate RLS Policies using public.firebase_uid()
CREATE POLICY "profiles_owner_upsert" ON public.profiles FOR INSERT WITH CHECK (public.firebase_uid() = id);
CREATE POLICY "profiles_owner_update" ON public.profiles FOR UPDATE USING (public.firebase_uid() = id) WITH CHECK (public.firebase_uid() = id);

CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT USING (public.firebase_uid() = user_id);

CREATE POLICY "protests_leader_insert" ON public.protests FOR INSERT WITH CHECK (public.firebase_uid() = leader_id AND public.has_role(public.firebase_uid(), 'leader'));
CREATE POLICY "protests_leader_update" ON public.protests FOR UPDATE USING (public.firebase_uid() = leader_id) WITH CHECK (public.firebase_uid() = leader_id);
CREATE POLICY "protests_leader_delete" ON public.protests FOR DELETE USING (public.firebase_uid() = leader_id);

CREATE POLICY "attendees_self_manage" ON public.protest_attendees FOR ALL USING (public.firebase_uid() = user_id) WITH CHECK (public.firebase_uid() = user_id);

CREATE POLICY "posts_author_insert" ON public.posts FOR INSERT WITH CHECK (public.firebase_uid() = author_id);
CREATE POLICY "posts_author_update" ON public.posts FOR UPDATE USING (public.firebase_uid() = author_id) WITH CHECK (public.firebase_uid() = author_id);
CREATE POLICY "posts_author_delete" ON public.posts FOR DELETE USING (public.firebase_uid() = author_id);

CREATE POLICY "comments_author_insert" ON public.comments FOR INSERT WITH CHECK (public.firebase_uid() = author_id);
CREATE POLICY "comments_author_update" ON public.comments FOR UPDATE USING (public.firebase_uid() = author_id) WITH CHECK (public.firebase_uid() = author_id);
CREATE POLICY "comments_author_delete" ON public.comments FOR DELETE USING (public.firebase_uid() = author_id);

CREATE POLICY "reactions_self_manage" ON public.post_reactions FOR ALL USING (public.firebase_uid() = user_id) WITH CHECK (public.firebase_uid() = user_id);
CREATE POLICY "follows_self_manage" ON public.follows FOR ALL USING (public.firebase_uid() = follower_id) WITH CHECK (public.firebase_uid() = follower_id);

CREATE POLICY "notifications_self_read" ON public.notifications FOR SELECT USING (public.firebase_uid() = user_id);
CREATE POLICY "notifications_self_update" ON public.notifications FOR UPDATE USING (public.firebase_uid() = user_id) WITH CHECK (public.firebase_uid() = user_id);

CREATE POLICY "parties_leader_insert" ON public.political_parties FOR INSERT WITH CHECK (public.firebase_uid() = leader_id AND public.has_role(public.firebase_uid(), 'leader'));
CREATE POLICY "parties_leader_update" ON public.political_parties FOR UPDATE USING (public.firebase_uid() = leader_id) WITH CHECK (public.firebase_uid() = leader_id);
CREATE POLICY "parties_leader_delete" ON public.political_parties FOR DELETE USING (public.firebase_uid() = leader_id);

CREATE POLICY "party_members_self_manage" ON public.party_members FOR ALL USING (public.firebase_uid() = user_id) WITH CHECK (public.firebase_uid() = user_id);

CREATE POLICY "chat_messages_author_insert" ON public.chat_messages FOR INSERT WITH CHECK (public.firebase_uid() = author_id);
CREATE POLICY "chat_messages_author_update" ON public.chat_messages FOR UPDATE USING (public.firebase_uid() = author_id) WITH CHECK (public.firebase_uid() = author_id);
CREATE POLICY "chat_messages_author_delete" ON public.chat_messages FOR DELETE USING (public.firebase_uid() = author_id);

CREATE POLICY "user_pins_self_manage" ON public.user_pins FOR ALL USING (public.firebase_uid() = user_id) WITH CHECK (public.firebase_uid() = user_id);


-- Grant Data API access to anon/authenticated/service_role on all public tables. Existing setup was missing all grants, causing PostgREST reads/writes to fail silently.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT SELECT ON public.posts TO anon;
GRANT ALL ON public.posts TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leader_subscriptions TO authenticated;
GRANT ALL ON public.leader_subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.protests TO authenticated;
GRANT SELECT ON public.protests TO anon;
GRANT ALL ON public.protests TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.protest_attendees TO authenticated;
GRANT SELECT ON public.protest_attendees TO anon;
GRANT ALL ON public.protest_attendees TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reactions TO authenticated;
GRANT SELECT ON public.post_reactions TO anon;
GRANT ALL ON public.post_reactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;

GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

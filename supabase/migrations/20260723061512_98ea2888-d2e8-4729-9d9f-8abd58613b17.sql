
ALTER VIEW public.country_stats SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- Keep authenticated execute on has_role: needed by RLS policies via SECURITY DEFINER path
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

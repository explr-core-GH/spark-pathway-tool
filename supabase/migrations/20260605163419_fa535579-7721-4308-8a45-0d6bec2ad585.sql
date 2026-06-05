
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_admin_seed() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_educator_self_escalation() FROM anon, authenticated, public;

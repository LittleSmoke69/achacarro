REVOKE EXECUTE ON FUNCTION public.admin_dashboard_stats(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_leads_overview(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_leads_overview(text) TO authenticated;
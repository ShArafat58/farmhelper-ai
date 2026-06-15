
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_score(uuid, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_diagnosis_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_crop_plan_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_listing_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_post_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_task_done_score() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

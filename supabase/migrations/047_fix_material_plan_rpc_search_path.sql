BEGIN;

-- Supabase Security Advisor flags SECURITY DEFINER functions unless their
-- search_path is pinned to an empty string. Both functions already use
-- schema-qualified public.* object references, so this only hardens execution
-- context without changing behavior.
ALTER FUNCTION public.claim_material_plan_generation_run(UUID, UUID, INTEGER)
  SET search_path = '';

ALTER FUNCTION public.confirm_learning_plan_draft(UUID, UUID)
  SET search_path = '';

COMMIT;

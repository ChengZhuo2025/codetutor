BEGIN;

ALTER TABLE public.site_help_categories
  ADD COLUMN IF NOT EXISTS icon_key VARCHAR(60) NOT NULL DEFAULT 'help-circle';

ALTER TABLE public.site_help_categories
  DROP CONSTRAINT IF EXISTS site_help_categories_icon_key_format;

ALTER TABLE public.site_help_categories
  ADD CONSTRAINT site_help_categories_icon_key_format
  CHECK (icon_key ~ '^[a-z0-9-]+$');

UPDATE public.site_help_categories
SET icon_key = CASE id
  WHEN '550e8400-e29b-41d4-a716-446655440101' THEN 'sparkles'
  WHEN '550e8400-e29b-41d4-a716-446655440102' THEN 'history'
  WHEN '550e8400-e29b-41d4-a716-446655440103' THEN 'credit-card'
  WHEN '550e8400-e29b-41d4-a716-446655440104' THEN 'message-square'
  ELSE icon_key
END;

COMMIT;

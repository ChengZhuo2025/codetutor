BEGIN;

ALTER TABLE public.learning_material_chunks
  ADD COLUMN IF NOT EXISTS evidence_type TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(4,3);

UPDATE public.learning_material_chunks
SET
  evidence_type = CASE
    WHEN modality = 'subtitle' THEN 'subtitle_track'
    WHEN modality = 'audio_transcript' THEN 'asr_transcript'
    WHEN modality = 'image_ocr' THEN 'ocr_text'
    WHEN modality = 'vision_summary' THEN 'vision_summary'
    ELSE 'raw_text'
  END,
  confidence = CASE
    WHEN modality = 'subtitle' THEN 0.920
    WHEN modality = 'audio_transcript' THEN 0.750
    WHEN modality = 'image_ocr' THEN 0.680
    WHEN modality = 'vision_summary' THEN 0.550
    ELSE 0.980
  END
WHERE evidence_type IS NULL
   OR confidence IS NULL;

ALTER TABLE public.learning_material_chunks
  ALTER COLUMN evidence_type SET DEFAULT 'raw_text',
  ALTER COLUMN confidence SET DEFAULT 0.980,
  ALTER COLUMN evidence_type SET NOT NULL,
  ALTER COLUMN confidence SET NOT NULL;

COMMIT;

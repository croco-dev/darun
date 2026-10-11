ALTER TABLE "llm_settings" ALTER COLUMN "model" SET DEFAULT 'nvidia/nemotron-3-super-120b-a12b:free';
--> statement-breakpoint
UPDATE "llm_settings"
SET "model" = 'nvidia/nemotron-3-super-120b-a12b:free',
    "thinking_level" = CASE WHEN "thinking_level" = 'high' THEN 'medium' ELSE "thinking_level" END,
    "updated_at" = now()
WHERE "id" = 'default'
  AND "model" = 'nvidia/nemotron-3-ultra-550b-a55b:free'
  AND "endpoint" IN ('https://openrouter.ai/api/v1', 'https://openrouter.ai/api/v1/');

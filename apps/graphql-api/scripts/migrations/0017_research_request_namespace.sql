-- Preserve the UUID text and every other job column; existing namespaced and
-- unsupported legacy identities are intentionally outside this data cutover.
DO $$
DECLARE
  bare_uuid_v4_pattern CONSTANT text := '^(?:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}|[a-f0-9]{12}4[a-f0-9]{3}[89ab][a-f0-9]{15})$';
BEGIN
  -- Keep the collision check and rename stable against concurrent writers.
  LOCK TABLE "product_research_jobs" IN SHARE ROW EXCLUSIVE MODE;

  IF EXISTS (
    SELECT 1
    FROM "product_research_jobs" AS bare
    JOIN "product_research_jobs" AS namespaced
      ON namespaced."request_key" = 'request:' || bare."request_key"
    WHERE bare."request_key" ~* bare_uuid_v4_pattern
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'Research request namespace migration refused: bare UUID and request:UUID identities conflict; no job history was changed';
  END IF;

  UPDATE "product_research_jobs"
  SET "request_key" = 'request:' || "request_key"
  WHERE "request_key" ~* bare_uuid_v4_pattern;
END $$;

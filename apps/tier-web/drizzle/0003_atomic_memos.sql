-- Historical migrations can commit the batch; keep this migration and its journal write together.
-- Drizzle owns the final commit. Manual SQL callers append COMMIT as documented in README.md.
BEGIN;
LOCK TABLE "public"."memos" IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "public"."memos" GROUP BY "app_id" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate app memos: preserve and reconcile contents explicitly before migration';
  END IF;
END $$;
ALTER TABLE "public"."memos" ADD CONSTRAINT "memos_app_id_unique" UNIQUE("app_id");

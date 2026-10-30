BEGIN;
LOCK TABLE "public"."memos" IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "public"."memos" GROUP BY "app_id" HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate app memos: preserve and reconcile contents explicitly before migration';
  END IF;
END $$;
ALTER TABLE "public"."memos" ADD CONSTRAINT "memos_app_id_unique" UNIQUE("app_id");
COMMIT;

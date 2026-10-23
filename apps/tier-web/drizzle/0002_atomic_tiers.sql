BEGIN;
LOCK TABLE "tiers", "memos", "apps" IN SHARE ROW EXCLUSIVE MODE;
-- Abort rather than silently reinterpret invalid historical assignments.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "tiers" WHERE "tier" NOT BETWEEN 0 AND 3) THEN
    RAISE EXCEPTION 'Invalid historical tiers: repair explicitly before migration';
  END IF;
END $$;
-- Keep latest assignment; NULL dates are oldest and UUID descending breaks ties.
DELETE FROM "tiers" WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id", row_number() OVER (
      PARTITION BY "app_id" ORDER BY "assigned_at" DESC NULLS LAST, "id" DESC
    ) AS position FROM "tiers"
  ) ranked WHERE position > 1
);
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_app_id_unique" UNIQUE ("app_id");
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_tier_range" CHECK ("tier" BETWEEN 0 AND 3);
ALTER TABLE "tiers" DROP CONSTRAINT "tiers_app_id_apps_id_fk";
ALTER TABLE "tiers" ADD CONSTRAINT "tiers_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE CASCADE;
ALTER TABLE "memos" DROP CONSTRAINT "memos_app_id_apps_id_fk";
ALTER TABLE "memos" ADD CONSTRAINT "memos_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE CASCADE;
COMMIT;

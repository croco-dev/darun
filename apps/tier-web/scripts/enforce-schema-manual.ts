import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({});

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);

async function enforceSchema() {
  try {
    console.log('Checking schema state...');

    // 1. Check/Create 'memos' table
    const memosExists = await sql`
			SELECT EXISTS (
				SELECT FROM information_schema.tables
				WHERE table_schema = 'public'
				AND table_name = 'memos'
			);
		`;

    if (!memosExists[0].exists) {
      console.log("Creating 'memos' table...");
      await sql`
				CREATE TABLE "memos" (
					"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
					"app_id" uuid NOT NULL,
					"content" text NOT NULL,
					"created_at" timestamp DEFAULT now(),
					"updated_at" timestamp DEFAULT now()
				);
			`;
      await sql`
				ALTER TABLE "memos" ADD CONSTRAINT "memos_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;
			`;
      console.log("'memos' table created.");
    } else {
      console.log("'memos' table already exists.");
    }

    // 2. Check/Add unique constraint to 'apps.app_store_id'
    // We check for the constraint by name 'apps_app_store_id_unique'
    const constraintExists = await sql`
			SELECT EXISTS (
				SELECT 1
				FROM pg_constraint
				WHERE conname = 'apps_app_store_id_unique'
			);
		`;

    if (!constraintExists[0].exists) {
      console.log('Adding unique constraint to apps.app_store_id...');
      // Check if there are any duplicates remaining (just in case)
      // If checking fails, the ALTER TABLE will fail anyway.
      try {
        await sql`
					ALTER TABLE "apps" ADD CONSTRAINT "apps_app_store_id_unique" UNIQUE("app_store_id");
				`;
        console.log('Unique constraint added.');
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error('Failed to add unique constraint. Ensure no duplicates exist.', message);
        process.exit(1);
      }
    } else {
      console.log("Unique constraint 'apps_app_store_id_unique' already exists.");
    }

    console.log('Schema enforcement completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error enforcing schema:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

enforceSchema();

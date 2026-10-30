import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({});

class SchemaRecoveryError extends Error {}

async function enforceSchema() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new SchemaRecoveryError('DATABASE_URL is required for manual schema recovery.');
  const sql = postgres(connectionString);

  try {
    await sql.begin(async transaction => {
      // Serialize recovery and keep concurrent app/memo writes out of the checks and DDL.
      await transaction.unsafe(`LOCK TABLE public.apps IN SHARE ROW EXCLUSIVE MODE`);
      await transaction.unsafe(`
        CREATE TABLE IF NOT EXISTS public.memos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          app_id uuid NOT NULL,
          content text NOT NULL,
          created_at timestamp DEFAULT now(),
          updated_at timestamp DEFAULT now()
        )
      `);
      await transaction.unsafe(`LOCK TABLE public.memos IN SHARE ROW EXCLUSIVE MODE`);

      async function readMemoConstraints() {
        return transaction.unsafe<{ valid: boolean }[]>(`
          SELECT contype = 'f'
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
              WHERE attrelid = 'public.memos'::regclass AND attname = 'app_id' AND NOT attisdropped)]
            AND confrelid = 'public.apps'::regclass
            AND confkey = ARRAY[(SELECT attnum FROM pg_attribute
              WHERE attrelid = 'public.apps'::regclass AND attname = 'id' AND NOT attisdropped)]
            AND confdeltype = 'c' AND confupdtype = 'a' AND confmatchtype = 's'
            AND convalidated AND NOT condeferrable AS valid
          FROM pg_constraint
          WHERE conrelid = 'public.memos'::regclass AND (
            conname = 'memos_app_id_apps_id_fk' OR (contype = 'f' AND
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.memos'::regclass
                AND attname = 'app_id' AND NOT attisdropped) = ANY(conkey))
          )
        `);
      }

      const memoConstraints = await readMemoConstraints();
      if (memoConstraints.some(constraint => constraint.valid !== true)) {
        throw new SchemaRecoveryError(
          'public.memos has an incompatible or unvalidated app_id constraint. Review it against the current migration; no data was deleted.'
        );
      }
      if (memoConstraints.length === 0) {
        const [orphans] = await transaction.unsafe(`
          SELECT EXISTS (SELECT 1 FROM public.memos m
            LEFT JOIN public.apps a ON a.id = m.app_id WHERE a.id IS NULL) AS found
        `);
        if (orphans.found) {
          throw new SchemaRecoveryError(
            'public.memos contains orphan app_id values. Resolve them explicitly before recovery; no data was deleted.'
          );
        }
        await transaction.unsafe(`
          ALTER TABLE public.memos ADD CONSTRAINT memos_app_id_apps_id_fk
          FOREIGN KEY (app_id) REFERENCES public.apps(id) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
      }

      async function readMemoUniqueConstraint() {
        return transaction.unsafe<{ valid: boolean }[]>(`
          SELECT contype = 'u' AND convalidated AND NOT condeferrable
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
              WHERE attrelid = 'public.memos'::regclass AND attname = 'app_id' AND NOT attisdropped)] AS valid
          FROM pg_constraint
          WHERE conrelid = 'public.memos'::regclass AND conname = 'memos_app_id_unique'
        `);
      }

      const memoUniqueConstraints = await readMemoUniqueConstraint();
      if (memoUniqueConstraints.some(constraint => constraint.valid !== true)) {
        throw new SchemaRecoveryError(
          'public.memos.memos_app_id_unique has an incompatible definition. Review it before recovery.'
        );
      }
      if (memoUniqueConstraints.length === 0) {
        const [duplicates] = await transaction.unsafe(`
          SELECT EXISTS (SELECT 1 FROM public.memos GROUP BY app_id HAVING count(*) > 1) AS found
        `);
        if (duplicates.found) {
          throw new SchemaRecoveryError(
            'public.memos contains duplicate app_id values. Preserve and reconcile contents explicitly before recovery; no data was deleted.'
          );
        }
        await transaction.unsafe(`ALTER TABLE public.memos ADD CONSTRAINT memos_app_id_unique UNIQUE (app_id)`);
      }

      async function readAppConstraint() {
        return transaction.unsafe<{ valid: boolean }[]>(`
          SELECT contype = 'u' AND convalidated AND NOT condeferrable
            AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
              WHERE attrelid = 'public.apps'::regclass AND attname = 'app_store_id' AND NOT attisdropped)] AS valid
          FROM pg_constraint
          WHERE conrelid = 'public.apps'::regclass AND conname = 'apps_app_store_id_unique'
        `);
      }

      const appConstraints = await readAppConstraint();
      if (appConstraints.some(constraint => constraint.valid !== true)) {
        throw new SchemaRecoveryError(
          'public.apps.apps_app_store_id_unique has an incompatible definition. Review it before recovery.'
        );
      }
      if (appConstraints.length === 0) {
        const [duplicates] = await transaction.unsafe(`
          SELECT EXISTS (SELECT 1 FROM public.apps WHERE app_store_id IS NOT NULL
            GROUP BY app_store_id HAVING count(*) > 1) AS found
        `);
        if (duplicates.found) {
          throw new SchemaRecoveryError(
            'public.apps contains duplicate app_store_id values. Resolve them explicitly before recovery; no data was deleted.'
          );
        }
        await transaction.unsafe(
          `ALTER TABLE public.apps ADD CONSTRAINT apps_app_store_id_unique UNIQUE (app_store_id)`
        );
      }

      const verifiedMemos = await readMemoConstraints();
      const verifiedMemoUnique = await readMemoUniqueConstraint();
      const verifiedApps = await readAppConstraint();
      if (
        verifiedMemos.length === 0 ||
        verifiedMemos.some(constraint => constraint.valid !== true) ||
        verifiedMemoUnique.length !== 1 ||
        verifiedMemoUnique[0].valid !== true ||
        verifiedApps.length !== 1 ||
        verifiedApps[0].valid !== true
      ) {
        throw new SchemaRecoveryError('Schema postcondition verification failed; recovery was rolled back.');
      }
    });
  } finally {
    await sql.end();
  }
  console.log(
    'Schema enforcement completed: memos CASCADE foreign key, memos.app_id and apps.app_store_id unique constraints verified.'
  );
}

enforceSchema().catch(error => {
  // PostgreSQL errors can contain row values, query parameters, or connection details.
  console.error(
    error instanceof SchemaRecoveryError
      ? error.message
      : 'Schema recovery failed; no successful result was confirmed. Check table definitions, database permissions, and current state before retrying.'
  );
  process.exitCode = 1;
});

import type postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

type Column = { name: string; type: string; notNull: boolean; primaryKey: boolean; default?: string | number };
type InitialTable = {
  name: string;
  columns: Record<string, Column>;
  uniqueConstraints: Record<string, { columns: string[] }>;
  foreignKeys: Record<
    string,
    { tableTo: string; columnsFrom: string[]; columnsTo: string[]; onDelete: string; onUpdate: string }
  >;
  indexes: Record<
    string,
    {
      name: string;
      isUnique: boolean;
      method: string;
      columns: { expression: string; isExpression: boolean; asc: boolean; nulls: string }[];
    }
  >;
};

// These normalizations are limited to equivalent spellings in the immutable initial snapshot.
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replaceAll('"', '')
    .replaceAll('public.', '')
    .replaceAll('character varying', 'varchar')
    .replaceAll('timestamp without time zone', 'timestamp')
    .replaceAll('current_timestamp', 'now()')
    .replace(/\s+on (delete|update) no action/g, '')
    .replace(/\s+asc\b/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** Read only: no DDL, journal creation, or writes are performed before this passes. */
export async function verifyInitialSchema(client: postgres.Sql, migrationsFolder: string, tag: string): Promise<void> {
  const snapshot = JSON.parse(
    readFileSync(join(migrationsFolder, 'meta', `${tag.split('_')[0]}_snapshot.json`), 'utf8')
  ) as {
    tables: Record<string, InitialTable>;
  };
  const columns = await client`
    SELECT c.relname AS table_name, a.attname AS column_name,
      format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS not_null,
      pg_get_expr(d.adbin, d.adrelid) AS default_value
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  `;
  const constraints = await client`
    SELECT c.relname AS table_name, pg_get_constraintdef(k.oid) AS definition,
      k.convalidated AS validated, k.condeferrable AS deferrable
    FROM pg_catalog.pg_constraint k
    JOIN pg_catalog.pg_class c ON c.oid = k.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  `;
  const indexes = await client`
    SELECT c.relname AS table_name, i.relname AS index_name,
      pg_get_indexdef(x.indexrelid) AS definition, x.indisvalid AS valid, x.indisready AS ready
    FROM pg_catalog.pg_index x
    JOIN pg_catalog.pg_class c ON c.oid = x.indrelid
    JOIN pg_catalog.pg_class i ON i.oid = x.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  `;
  const differences: string[] = [];
  for (const table of Object.values(snapshot.tables)) {
    const actual = columns.filter(row => row['table_name'] === table.name);
    if (!actual.length) {
      differences.push(`${table.name}: missing table`);
      continue;
    }
    for (const column of Object.values(table.columns)) {
      const found = actual.find(row => row['column_name'] === column.name);
      const path = `${table.name}.${column.name}`;
      if (!found) differences.push(`${path}: missing column`);
      else {
        if (normalize(String(found['type'])) !== normalize(column.type)) differences.push(`${path}: incompatible type`);
        if (found['not_null'] !== column.notNull) differences.push(`${path}: incompatible nullability`);
        if (normalize(String(found['default_value'] ?? '')) !== normalize(String(column.default ?? ''))) {
          differences.push(`${path}: incompatible default`);
        }
      }
    }
    const required = [
      `PRIMARY KEY (${Object.values(table.columns)
        .filter(column => column.primaryKey)
        .map(column => column.name)
        .join(',')})`,
      ...Object.values(table.uniqueConstraints).map(key => `UNIQUE (${key.columns.join(',')})`),
      ...Object.values(table.foreignKeys).map(
        key =>
          `FOREIGN KEY (${key.columnsFrom.join(',')}) REFERENCES ${key.tableTo}(${key.columnsTo.join(',')}) ON DELETE ${key.onDelete} ON UPDATE ${key.onUpdate}`
      ),
    ];
    for (const definition of required) {
      if (
        !constraints.some(
          row =>
            row['table_name'] === table.name &&
            row['validated'] &&
            !row['deferrable'] &&
            normalize(String(row['definition'])) === normalize(definition)
        )
      ) {
        differences.push(`${table.name}: missing or incompatible ${definition}`);
      }
    }
    for (const index of Object.values(table.indexes)) {
      const expressions = index.columns.map(column =>
        column.isExpression
          ? column.expression
          : `${column.expression}${column.asc ? '' : ' DESC'}${column.nulls === (column.asc ? 'last' : 'first') ? '' : ` NULLS ${column.nulls}`}`
      );
      const expected = `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} USING ${index.method} (${expressions.join(',')})`;
      if (
        !indexes.some(
          row =>
            row['table_name'] === table.name &&
            row['index_name'] === index.name &&
            row['valid'] &&
            row['ready'] &&
            normalize(String(row['definition'])) === normalize(expected)
        )
      ) {
        differences.push(`${table.name}.${index.name}: missing or incompatible index`);
      }
    }
  }
  if (differences.length) {
    throw new Error(`Initial schema is incompatible; no baseline recorded:\n${differences.join('\n')}`);
  }
}

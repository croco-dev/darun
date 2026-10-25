import type postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    .replace(/"([a-z_][a-z0-9_]*)"/g, '$1')
    .replaceAll('character varying', 'varchar')
    .replaceAll('timestamp without time zone', 'timestamp')
    .replaceAll('CURRENT_TIMESTAMP', 'now()')
    .replace(/\s+/g, ' ')
    .replaceAll(' ON DELETE no action', '')
    .replaceAll(' ON UPDATE no action', '')
    .replace(/ ASC\b/g, '')
    .replace(/ desc\b/g, ' DESC')
    .replaceAll(' ', '');
}

/** Read only: no DDL, journal creation, or writes are performed before this passes. */
export async function verifyInitialSchema(client: postgres.Sql, migrationsFolder: string, tag: string): Promise<void> {
  const snapshot = JSON.parse(
    readFileSync(join(migrationsFolder, 'meta', `${tag.split('_')[0]}_snapshot.json`), 'utf8')
  ) as {
    tables: Record<string, InitialTable>;
  };
  const columns = await client<CatalogColumn[]>`
    SELECT c.relname AS table_name, a.attname AS column_name,
      format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS not_null,
      pg_get_expr(d.adbin, d.adrelid) AS default_value
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  `;
  const constraints = await client<CatalogConstraint[]>`
    SELECT c.relname AS table_name, pg_get_constraintdef(k.oid) AS definition,
      k.convalidated AS validated, k.condeferrable AS deferrable
    FROM pg_catalog.pg_constraint k
    JOIN pg_catalog.pg_class c ON c.oid = k.conrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  `;
  const indexes = await client<CatalogIndex[]>`
    SELECT c.relname AS table_name, i.relname AS index_name,
      pg_get_indexdef(x.indexrelid) AS definition, x.indisvalid AS valid, x.indisready AS ready
    FROM pg_catalog.pg_index x
    JOIN pg_catalog.pg_class c ON c.oid = x.indrelid
    JOIN pg_catalog.pg_class i ON i.oid = x.indexrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
  `;
  const differences = Object.values(snapshot.tables).flatMap(table =>
    compareTable(table, columns, constraints, indexes)
  );
  if (differences.length) {
    throw new Error(`Initial schema is incompatible; no baseline recorded:\n${differences.join('\n')}`);
  }
}

type CatalogColumn = {
  table_name: string;
  column_name: string;
  type: string;
  not_null: boolean;
  default_value: string | null;
};
type CatalogConstraint = { table_name: string; definition: string; validated: boolean; deferrable: boolean };
type CatalogIndex = { table_name: string; index_name: string; definition: string; valid: boolean; ready: boolean };

function compareColumn(table: string, column: Column, found: CatalogColumn | undefined): string[] {
  const path = `${table}.${column.name}`;
  if (!found) return [`${path}: missing column`];
  const differences: string[] = [];
  if (normalize(found['type']) !== normalize(column.type)) differences.push(`${path}: incompatible type`);
  if (found['not_null'] !== column.notNull) differences.push(`${path}: incompatible nullability`);
  if (normalize(found['default_value'] ?? '') !== normalize(String(column.default ?? ''))) {
    differences.push(`${path}: incompatible default`);
  }
  return differences;
}

// The caller pins search_path to public, so constraint targets in public are unqualified.
// Preserve catalog definitions verbatim: qualifier text may occur inside quoted identifiers.
function compareConstraints(table: InitialTable, constraints: CatalogConstraint[]): string[] {
  const primary = Object.values(table.columns)
    .filter(column => column.primaryKey)
    .map(column => column.name);
  const required = [
    `PRIMARY KEY (${primary.join(',')})`,
    ...Object.values(table.uniqueConstraints).map(key => `UNIQUE (${key.columns.join(',')})`),
    ...Object.values(table.foreignKeys).map(
      key =>
        `FOREIGN KEY (${key.columnsFrom.join(',')}) REFERENCES ${key.tableTo}(${key.columnsTo.join(',')}) ON DELETE ${key.onDelete} ON UPDATE ${key.onUpdate}`
    ),
  ];
  return required
    .filter(
      definition =>
        !constraints.some(
          row =>
            row['table_name'] === table.name &&
            row['validated'] &&
            !row['deferrable'] &&
            normalize(row['definition']) === normalize(definition)
        )
    )
    .map(definition => `${table.name}: missing or incompatible ${definition}`);
}

function indexColumn(column: InitialTable['indexes'][string]['columns'][number]): string {
  if (column.isExpression) return column.expression;
  const direction = column.asc ? '' : ' DESC';
  const defaultNulls = column.asc ? 'last' : 'first';
  const nulls = column.nulls === defaultNulls ? '' : ` NULLS ${column.nulls}`;
  return `${column.expression}${direction}${nulls}`;
}

function compareIndexes(table: InitialTable, indexes: CatalogIndex[]): string[] {
  return Object.values(table.indexes)
    .filter(index => {
      const expressions = index.columns.map(indexColumn);
      const unique = index.isUnique ? 'UNIQUE ' : '';
      // pg_get_indexdef always qualifies the indexed table with its schema.
      const expected = `CREATE ${unique}INDEX ${index.name} ON public.${table.name} USING ${index.method} (${expressions.join(',')})`;
      return !indexes.some(
        row =>
          row['table_name'] === table.name &&
          row['index_name'] === index.name &&
          row['valid'] &&
          row['ready'] &&
          normalize(row['definition']) === normalize(expected)
      );
    })
    .map(index => `${table.name}.${index.name}: missing or incompatible index`);
}

function compareTable(
  table: InitialTable,
  columns: CatalogColumn[],
  constraints: CatalogConstraint[],
  indexes: CatalogIndex[]
): string[] {
  const actual = columns.filter(row => row['table_name'] === table.name);
  if (!actual.length) return [`${table.name}: missing table`];
  return [
    ...Object.values(table.columns).flatMap(column =>
      compareColumn(
        table.name,
        column,
        actual.find(row => row['column_name'] === column.name)
      )
    ),
    ...compareConstraints(table, constraints),
    ...compareIndexes(table, indexes),
  ];
}

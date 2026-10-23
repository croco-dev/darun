import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const providerRoot = fileURLToPath(new URL('../../../libs/shared/provider-graphql/', import.meta.url));
const providerRequire = createRequire(path.join(providerRoot, 'package.json'));
const { loadContext } = providerRequire('@graphql-codegen/cli');
const directories: string[] = [];

async function loadFixtureDocuments(includeMalformedDocument: boolean) {
  const directory = mkdtempSync(path.join(tmpdir(), 'darun-schema-documents-'));
  directories.push(directory);
  writeFileSync(
    path.join(directory, 'valid.ts'),
    "throw new Error('Application modules must not execute');\nconst document = gql`query StaticOnly { hello }`;"
  );
  writeFileSync(path.join(directory, 'no-document.ts'), "throw new Error('Application modules must not execute');");
  if (includeMalformedDocument) {
    writeFileSync(path.join(directory, 'invalid.ts'), 'const document = gql`query Malformed {`;');
  }
  const context = await loadContext(path.join(providerRoot, 'codegen.ts'));
  context.updateConfig({ cwd: providerRoot });
  return context.loadDocuments(path.join(directory, '*.ts'));
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe('configured consumer document loader', () => {
  it('plucks documents without executing application modules', async () => {
    const documents = await loadFixtureDocuments(false);
    expect(documents).toHaveLength(1);
    expect(documents[0].document.definitions[0].name.value).toBe('StaticOnly');
  });

  it('rejects a malformed document even when another matched document is valid', async () => {
    await expect(loadFixtureDocuments(true)).rejects.toThrow(/Syntax Error/);
  });
});

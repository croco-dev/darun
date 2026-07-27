import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('ProductMutationResolver dependency metadata', () => {
  it('emits concrete runtime types for every constructor dependency', () => {
    const filePath = path.resolve(process.cwd(), 'src/Product.mutation.resolver.ts');
    const source = fs.readFileSync(filePath, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const metadataMatches = [...output.matchAll(/__metadata\("design:paramtypes", \[([^\]]*)\]\)/g)];
    const constructorMetadata = metadataMatches[metadataMatches.length - 1]?.[1];

    expect(constructorMetadata).toBeDefined();
    expect(constructorMetadata).not.toMatch(/(?:^|,)\s*Object(?=\s*(?:,|$))/);
    expect(constructorMetadata).toContain('GetCompany');
    expect(constructorMetadata).toContain('TranslationJobService');
    expect(constructorMetadata).toContain('UpvoteProduct');
  });
});

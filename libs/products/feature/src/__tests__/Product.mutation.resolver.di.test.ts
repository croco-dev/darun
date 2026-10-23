import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('ProductMutationResolver dependency metadata', () => {
  it('emits runtime classes and explicitly injects the app-owned sync port token', () => {
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
    expect(constructorMetadata?.match(/(?:^|,)\s*Object(?=\s*(?:,|$))/g)).toHaveLength(1);
    expect(output).toMatch(/__param\(\d+, Inject\(ProductContentSyncToken\)\)/);
    expect(constructorMetadata).toContain('GetCompany');
    expect(constructorMetadata).toContain('ProductDescriptionJobService');
    expect(constructorMetadata).toContain('UpvoteProduct');
  });
});

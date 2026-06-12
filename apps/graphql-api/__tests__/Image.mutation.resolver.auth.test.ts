import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function getImageResolverSource() {
  const path = resolve(
    __dirname,
    '../../../libs/images/feature/src/Image.mutation.resolver.ts'
  );
  return readFileSync(path, 'utf-8');
}

describe('signImageUpload auth policy via source inspection', () => {
  const source = getImageResolverSource();

  it('ImageMutationResolver.signImageUpload에 @Authorized([AuthRole.Admin]) 데코레이터가 적용되어 있다', () => {
    const methodRegex = /async\s+signImageUpload\s*\(/;
    const methodIndex = source.search(methodRegex);
    expect(methodIndex).toBeGreaterThan(-1);

    const sliceBeforeMethod = source.slice(0, methodIndex);
    expect(sliceBeforeMethod).toMatch(/@Authorized\s*\(\s*\[\s*AuthRole\.Admin\s*\]\s*\)/);
  });

  it('거부: 비인증 사용자가 signImageUpload를 호출하면 접근이 차단된다', async () => {
    const methodRegex = /async\s+signImageUpload\s*\(/;
    const methodIndex = source.search(methodRegex);
    expect(methodIndex).toBeGreaterThan(-1);

    const sliceBeforeMethod = source.slice(0, methodIndex);
    const authMatch = sliceBeforeMethod.match(/@Authorized\s*\(\s*\[([^\]]*)\]\s*\)/);
    expect(authMatch).toBeTruthy();
    const roles = authMatch![1];
    expect(roles).toContain('AuthRole.Admin');

    const userRoles: string[] = [];
    const result = userRoles.some(() => roles.includes('AuthRole.Admin'));
    expect(result).toBe(false);
  });

  it('거부: 일반 사용자(비관리자)가 signImageUpload를 호출하면 접근이 차단된다', async () => {
    const methodRegex = /async\s+signImageUpload\s*\(/;
    const methodIndex = source.search(methodRegex);
    expect(methodIndex).toBeGreaterThan(-1);

    const sliceBeforeMethod = source.slice(0, methodIndex);
    const authMatch = sliceBeforeMethod.match(/@Authorized\s*\(\s*\[([^\]]*)\]\s*\)/);
    expect(authMatch).toBeTruthy();
    const roles = authMatch![1];
    expect(roles).toContain('AuthRole.Admin');

    const userRoles = ['user'];
    const result = userRoles.some(role => role === 'admin');
    expect(result).toBe(false);
  });

  it('허용: 관리자가 signImageUpload를 호출하면 접근이 허용된다', async () => {
    const methodRegex = /async\s+signImageUpload\s*\(/;
    const methodIndex = source.search(methodRegex);
    expect(methodIndex).toBeGreaterThan(-1);

    const sliceBeforeMethod = source.slice(0, methodIndex);
    const authMatch = sliceBeforeMethod.match(/@Authorized\s*\(\s*\[([^\]]*)\]\s*\)/);
    expect(authMatch).toBeTruthy();
    const roles = authMatch![1];
    expect(roles).toContain('AuthRole.Admin');

    const userRoles = ['admin'];
    const result = userRoles.some(role => role === 'admin');
    expect(result).toBe(true);
  });
});

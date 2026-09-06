import { describe, expect, it } from 'vitest';
import { appendVary, negotiateRepresentation } from '../lib/seo/accept';

describe('negotiateRepresentation', () => {
  it('헤더가 없거나 비어있으면 기본값 html을 반환한다', () => {
    expect(negotiateRepresentation(null)).toBe('html');
    expect(negotiateRepresentation(undefined)).toBe('html');
    expect(negotiateRepresentation('')).toBe('html');
    expect(negotiateRepresentation('   ')).toBe('html');
  });

  it('text/html 요청 시 html을 반환한다', () => {
    expect(negotiateRepresentation('text/html')).toBe('html');
    expect(negotiateRepresentation('text/html, application/xhtml+xml')).toBe('html');
  });

  it('text/markdown 요청 시 markdown을 반환한다', () => {
    expect(negotiateRepresentation('text/markdown')).toBe('markdown');
  });

  it('markdown이 html보다 높은 quality이면 markdown을 반환한다', () => {
    expect(negotiateRepresentation('text/markdown;q=1, text/html;q=0.8')).toBe('markdown');
    expect(negotiateRepresentation('text/markdown, text/html;q=0.8')).toBe('markdown');
  });

  it('html이 markdown보다 높은 quality이면 html을 반환한다', () => {
    expect(negotiateRepresentation('text/html;q=0.9, text/markdown;q=0.5')).toBe('html');
    expect(negotiateRepresentation('text/html, text/markdown;q=0.1')).toBe('html');
  });

  it('*/* 와일드카드만 있으면 기본값 html을 반환한다', () => {
    expect(negotiateRepresentation('*/*')).toBe('html');
    expect(negotiateRepresentation('*/*;q=0.8')).toBe('html');
  });

  it('markdown이 q=0으로 명시적 거부되면 html을 반환한다', () => {
    expect(negotiateRepresentation('text/markdown;q=0, text/html')).toBe('html');
    expect(negotiateRepresentation('text/markdown;q=0, text/*;q=0.8')).toBe('html');
  });

  it('html이 q=0으로 명시적 거부되고 markdown이 허용되면 markdown을 반환한다', () => {
    expect(negotiateRepresentation('text/html;q=0, */*;q=1')).toBe('markdown');
    expect(negotiateRepresentation('text/html;q=0, text/markdown')).toBe('markdown');
  });

  it('지원하지 않는 미디어 타입만 요구하면 not-acceptable을 반환한다', () => {
    expect(negotiateRepresentation('application/pdf')).toBe('not-acceptable');
    expect(negotiateRepresentation('image/png, image/webp')).toBe('not-acceptable');
    expect(negotiateRepresentation('text/html;q=0, text/markdown;q=0')).toBe('not-acceptable');
  });

  it('동일한 quality일 때 클라이언트 지정 순서를 우선한다', () => {
    expect(negotiateRepresentation('text/markdown;q=0.9, text/html;q=0.9')).toBe('markdown');
    expect(negotiateRepresentation('text/html;q=0.9, text/markdown;q=0.9')).toBe('html');
  });

  it('더 구체적인(specific) 미디어 범위가 와일드카드보다 우선한다', () => {
    // text/html이 0.9로 매치되고, text/markdown은 text/* (0.8)로 매치됨
    expect(negotiateRepresentation('text/*;q=0.8, text/html;q=0.9')).toBe('html');
    // text/markdown이 0.9로 매치되고, text/html은 text/* (0.8)로 매치됨
    expect(negotiateRepresentation('text/*;q=0.8, text/markdown;q=0.9')).toBe('markdown');
  });
});

describe('appendVary', () => {
  it('기존 헤더가 없거나 비어있으면 지정된 토큰만 반환한다', () => {
    expect(appendVary(null, 'Accept')).toBe('Accept');
    expect(appendVary(undefined, 'Accept')).toBe('Accept');
    expect(appendVary('', 'Accept')).toBe('Accept');
    expect(appendVary('   ', 'Accept')).toBe('Accept');
  });

  it('기존 Vary 토큰들을 보존하며 새 토큰을 추가한다', () => {
    expect(appendVary('rsc', 'Accept')).toBe('rsc, Accept');
    expect(appendVary('rsc, next-router-state-tree', 'Accept')).toBe('rsc, next-router-state-tree, Accept');
  });

  it('이미 토큰이 대소문자 무관하게 존재하면 중복 추가하지 않는다', () => {
    expect(appendVary('Accept', 'Accept')).toBe('Accept');
    expect(appendVary('accept', 'Accept')).toBe('accept');
    expect(appendVary('rsc, accept, next-url', 'Accept')).toBe('rsc, accept, next-url');
    expect(appendVary('rsc, Accept', 'Accept')).toBe('rsc, Accept');
  });
});

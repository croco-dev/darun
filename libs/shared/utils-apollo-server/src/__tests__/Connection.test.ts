import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Connection } from '../pagination/Connection';
import { Cursor } from '../pagination/Cursor';

describe('Connection 페이지 경계', () => {
  beforeEach(() => vi.stubEnv('CURSOR_SIGNATURE_SECRET', 'connection-boundary-test'));
  afterEach(() => vi.unstubAllEnvs());

  it.each([0, 1, 49, 50, 51, 100, 101])('%i개를 빈 경계 페이지 없이 양방향으로 순회한다', count => {
    const ids = Array.from({ length: count }, (_, index) => String(count - index).padStart(3, '0'));
    const page = (type: 'after' | 'before', cursor?: string) => {
      const id = cursor ? Cursor.decode(cursor, ['id'] as const).id : undefined;
      const remaining = ids.filter(value => !id || (type === 'after' ? value < id : value > id));
      const selected = type === 'after' ? remaining.slice(0, 51) : remaining.slice(-51);
      return Connection.create({
        nodes: selected.map(id => ({ id })),
        cursorKeys: ['id'],
        totalCount: count,
        previous: { type, cursor, limit: 50 },
      });
    };

    let current = page('after');
    const forward = current.edges.map(edge => edge.node.id);
    expect(current.pageInfo.hasPreviousPage).toBe(false);
    while (current.pageInfo.hasNextPage) {
      current = page('after', current.pageInfo.endCursor);
      expect(current.edges.length).toBeGreaterThan(0);
      forward.push(...current.edges.map(edge => edge.node.id));
    }
    expect(forward).toEqual(ids);
    expect(current.pageInfo.hasNextPage).toBe(false);

    let firstIndex = Math.max(0, Math.ceil(count / 50) - 1) * 50;
    while (current.pageInfo.hasPreviousPage) {
      current = page('before', current.pageInfo.startCursor);
      firstIndex = Math.max(0, firstIndex - 50);
      expect(current.edges.map(edge => edge.node.id)).toEqual(ids.slice(firstIndex, firstIndex + 50));
      expect(current.pageInfo.hasNextPage).toBe(true);
    }
    expect(current.edges.map(edge => edge.node.id)).toEqual(ids.slice(0, 50));
    expect(current.pageInfo.hasPreviousPage).toBe(false);
  });

  it('역방향 조회의 추가 확인용 행을 앞에서 제거한 뒤 페이지와 커서를 만든다', () => {
    const result = Connection.create({
      nodes: ['105', '104', '103'].map(id => ({ id })),
      cursorKeys: ['id'],
      totalCount: 5,
      previous: { type: 'before', limit: 2, cursor: 'next-page' },
    });
    expect(result.edges.map(edge => edge.node.id)).toEqual(['104', '103']);
    expect(Cursor.decode(result.pageInfo.startCursor!, ['id'] as const)).toEqual({ id: '104' });
    expect(Cursor.decode(result.pageInfo.endCursor!, ['id'] as const)).toEqual({
      id: '103',
    });
    expect(result.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it('before 커서 없는 last 조회는 가장 오래된 끝에서 시작한다', () => {
    const result = Connection.create({
      nodes: ['003', '002', '001'].map(id => ({ id })),
      cursorKeys: ['id'],
      totalCount: 7,
      previous: { type: 'before', limit: 2 },
    });
    expect(result.edges.map(edge => edge.node.id)).toEqual(['002', '001']);
    expect(result.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });
});

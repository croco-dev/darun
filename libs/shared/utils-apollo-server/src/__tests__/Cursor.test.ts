import { beforeAll, describe, expect, it } from 'vitest';
import { Cursor } from '../pagination/Cursor';

beforeAll(() => {
  process.env.CURSOR_SIGNATURE_SECRET = 'test-secret';
});

describe('Cursor', () => {
  it('encodes and decodes signed cursor values', () => {
    const cursor = Cursor.encode({ id: 'product-1', createdAt: new Date('2026-01-02T03:04:05.000Z') }, [
      'id',
      'createdAt',
    ]);

    expect(Cursor.decode(cursor, ['id', 'createdAt'] as const)).toEqual({
      id: 'product-1',
      createdAt: '2026-01-02T03:04:05.000Z',
    });
  });

  it('throws when cursor contents are modified', () => {
    const cursor = Cursor.encode({ id: 'product-1' }, ['id']);
    const payload = Buffer.from(cursor, 'base64').toString('utf8');
    const modifiedCursor = Buffer.from(payload.replace('product-1', 'product-2')).toString('base64');

    expect(() => Cursor.decode(modifiedCursor, ['id'] as const)).toThrow('pagination/invalid-cursor');
  });

  it('preserves empty values', () => {
    const cursor = Cursor.encode({ id: '' }, ['id']);

    expect(Cursor.decode(cursor, ['id'] as const)).toEqual({ id: '' });
  });

  it('decodes legacy unsigned cursor (backward compatibility)', () => {
    const legacyCursor = Buffer.from('id__KEY_DELIMITER__product-1').toString('base64');

    expect(Cursor.decode(legacyCursor, ['id'] as const)).toEqual({ id: 'product-1' });
  });

  it('decodes legacy unsigned cursor with multiple keys', () => {
    const legacyCursor = Buffer.from(
      'id__KEY_DELIMITER__product-1__CURSOR_DELIMITER__createdAt__KEY_DELIMITER__2026-01-02T03:04:05.000Z'
    ).toString('base64');

    expect(Cursor.decode(legacyCursor, ['id', 'createdAt'] as const)).toEqual({
      id: 'product-1',
      createdAt: '2026-01-02T03:04:05.000Z',
    });
  });
});

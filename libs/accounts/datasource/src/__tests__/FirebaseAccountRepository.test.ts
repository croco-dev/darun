import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { FirebaseAccountRepository } from '../repositories/FirebaseAccountRepository';

const mockVerifyIdToken = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

describe('FirebaseAccountRepository.parseByToken', () => {
  let repository: FirebaseAccountRepository;

  beforeEach(() => {
    repository = new FirebaseAccountRepository();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mapped account for a valid token', async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: 'user-123',
      email: 'test@example.com',
      roles: ['admin'],
    });

    const result = await repository.parseByToken('valid-token');

    expect(result).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      roles: ['admin'],
    });
  });

  it('returns null when token is expired', async () => {
    mockVerifyIdToken.mockRejectedValue({ code: 'auth/id-token-expired' });

    const result = await repository.parseByToken('expired-token');

    expect(result).toBeNull();
  });

  it('returns null when token is revoked', async () => {
    mockVerifyIdToken.mockRejectedValue({ code: 'auth/id-token-revoked' });

    const result = await repository.parseByToken('revoked-token');

    expect(result).toBeNull();
  });

  it('returns null when token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValue({ code: 'auth/invalid-id-token' });

    const result = await repository.parseByToken('invalid-token');

    expect(result).toBeNull();
  });

  it('returns null when token is malformed (argument-error)', async () => {
    mockVerifyIdToken.mockRejectedValue({ code: 'auth/argument-error' });

    const result = await repository.parseByToken('malformed-token');

    expect(result).toBeNull();
  });

  it('rethrows on network error', async () => {
    const networkError = new Error('network request failed');
    (networkError as unknown as Record<string, unknown>).code = 'auth/network-request-failed';
    mockVerifyIdToken.mockRejectedValue(networkError);

    await expect(repository.parseByToken('any-token')).rejects.toThrow('network request failed');
  });

  it('rethrows on unknown error', async () => {
    const unknownError = new Error('something went wrong');
    mockVerifyIdToken.mockRejectedValue(unknownError);

    await expect(repository.parseByToken('any-token')).rejects.toThrow('something went wrong');
  });

  it('rethrows on internal error', async () => {
    const internalError = new Error('internal error');
    (internalError as unknown as Record<string, unknown>).code = 'auth/internal-error';
    mockVerifyIdToken.mockRejectedValue(internalError);

    await expect(repository.parseByToken('any-token')).rejects.toThrow('internal error');
  });
});

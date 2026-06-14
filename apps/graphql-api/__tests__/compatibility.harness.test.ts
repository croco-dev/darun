import { describe, it, expect, vi } from 'vitest';
import { createGraphQLContext } from '../src/functions/context';

describe('Croco API runtime compatibility harness', () => {
  describe('problems-core through darun wrapper', () => {
    it('harness module exports Container and Context after initialization', async () => {
      // Dynamic import to avoid side effects on module load — this mirrors
      // how the harness would be used (lazy, not on production path).
      const mod = await import('../src/compatibility/harness');
      expect(mod.Container).toBeDefined();
      expect(mod.Context).toBeDefined();
    });

    it('getHarnessToken reads back registered value', async () => {
      const { getHarnessToken, HARNESS_TOKEN } = await import('../src/compatibility/harness');
      const token = getHarnessToken();
      expect(token).toEqual({ ready: true });
      // HARNESS_TOKEN must be a usable DI token (string)
      expect(typeof HARNESS_TOKEN).toBe('string');
    });

    it('Context.run and Context.get round-trip request metadata', async () => {
      const { Context, runWithRequestContext } = await import('../src/compatibility/harness');
      // runWithRequestContext internally calls Context.run with a requestId
      expect(typeof runWithRequestContext).toBe('function');

      // Context.get should return null outside of a run block
      expect(Context.get()).toBeNull();

      // Inside a run block, Context.get returns the context
      const result = runWithRequestContext('req-test-001', () => {
        const ctx = Context.get();
        return { requestId: ctx?.requestId };
      });
      expect(result).toEqual({ requestId: 'req-test-001' });
    });

    it('HarnessValidationProblem creates Problem subclass correctly', async () => {
      const { HarnessValidationProblem, harnessFactoryError } = await import('../src/compatibility/harness');

      const problem = new HarnessValidationProblem();
      expect(problem.code).toBe('compatibility-harness/validation-error');
      expect(problem.status).toBe(422);

      const factoryProblem = harnessFactoryError('test detail');
      expect(factoryProblem.code).toBe('compatibility-harness/factory');
      expect(factoryProblem.status).toBe(422);
      expect(factoryProblem.detail).toBe('test detail');
    });

    it('Problem toJSON yields RFC 7807 shape', async () => {
      const { HarnessValidationProblem } = await import('../src/compatibility/harness');

      const problem = new HarnessValidationProblem();
      const json = problem.toJSON();
      expect(json).toMatchObject({
        type: 'about:blank',
        title: 'Validation Error',
        status: 422,
        code: 'compatibility-harness/validation-error',
      });
      expect(json.detail).toBeUndefined();
    });
  });

  describe('framework-context through darun wrapper', () => {
    it('getLoggerToken returns a TypeDI Token object', async () => {
      const { getLoggerToken } = await import('../src/compatibility/harness');
      const token = getLoggerToken();
      // TypeDI Token is a class instance, not a raw symbol
      expect(token).toBeDefined();
      expect(typeof token).toBe('object');
      // A Token always has a .name property (string | symbol)
      expect(['string', 'symbol']).toContain(typeof (token as { name: unknown }).name);
    });

    it('getShutdownManager returns a singleton instance', async () => {
      const { getShutdownManager } = await import('../src/compatibility/harness');
      const mgr1 = getShutdownManager();
      const mgr2 = getShutdownManager();
      expect(mgr1).toBe(mgr2);
    });
  });

  describe('GraphQL context behavior remains unchanged', () => {
    it('baseline context shape is preserved', async () => {
      const getAccountUseCase = { execute: () => Promise.resolve(undefined) };
      const context = createGraphQLContext({
        requestId: 'req-harness',
        authToken: 'token-harness',
        clientIp: '10.0.0.1',
        getAccountUseCase,
      });

      expect(context).toMatchObject({
        requestId: 'req-harness',
        authToken: 'token-harness',
        clientIp: '10.0.0.1',
      });
      expect(typeof context.getUserId).toBe('function');
      expect(typeof context.getUserIdOrThrow).toBe('function');
      expect(typeof context.getRoles).toBe('function');
    });

    it('memoization still deduplicates GetAccount.execute', async () => {
      const execute = vi.fn().mockResolvedValue({
        id: 'usr-harness',
        email: 'harness@darun.io',
        roles: ['admin'],
      });

      const context = createGraphQLContext({
        requestId: 'req-harness-memo',
        authToken: 'token-memo',
        getAccountUseCase: { execute },
      });

      const [userId, userIdOrThrow, roles] = await Promise.all([
        context.getUserId(),
        context.getUserIdOrThrow(),
        context.getRoles(),
      ]);

      expect(userId).toBe('usr-harness');
      expect(userIdOrThrow).toBe('usr-harness');
      expect(roles).toEqual(['admin']);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    it('rejects with error when no auth token and getUserIdOrThrow called', async () => {
      const execute = vi.fn().mockResolvedValue(null);
      const context = createGraphQLContext({
        requestId: 'req-harness-noauth',
        authToken: undefined,
        getAccountUseCase: { execute },
      });

      await expect(context.getUserIdOrThrow()).rejects.toThrow('Unauthorized');
    });
  });
});

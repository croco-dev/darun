import { describe, it, expect } from 'vitest';

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
});

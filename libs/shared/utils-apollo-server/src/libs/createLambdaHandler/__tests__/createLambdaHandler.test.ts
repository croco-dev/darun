import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockHandler = vi.fn();

vi.mock('@apollo/server', () => ({
  ApolloServer: vi.fn(),
}));

vi.mock('@as-integrations/aws-lambda', () => ({
  startServerAndCreateLambdaHandler: vi.fn(() => mockHandler),
  handlers: {
    createAPIGatewayProxyEventV2RequestHandler: vi.fn(() => vi.fn()),
  },
}));

const createEventFixture = () => ({}) as unknown as import('aws-lambda').APIGatewayProxyEventV2;
const createContextFixture = () => ({}) as unknown as import('aws-lambda').Context;

describe('createLambdaHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call sync middleware on first invocation', async () => {
    const syncMiddleware = vi.fn();
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([syncMiddleware], server);

    expect(syncMiddleware).not.toHaveBeenCalled();

    const event = createEventFixture();
    const context = createContextFixture();
    const callback = vi.fn();
    await wrappedHandler(event, context, callback);

    expect(syncMiddleware).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(event, context, callback);
  });

  it('should await async middlewares before handling the request', async () => {
    let middlewareResolved = false;
    const asyncMiddleware = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      middlewareResolved = true;
    });
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([asyncMiddleware], server);

    expect(asyncMiddleware).not.toHaveBeenCalled();

    const event = createEventFixture();
    const context = createContextFixture();
    const callback = vi.fn();
    await wrappedHandler(event, context, callback);

    expect(middlewareResolved).toBe(true);
    expect(mockHandler).toHaveBeenCalledWith(event, context, callback);
  });

  it('should retry when a sync middleware throws on first invocation', async () => {
    let calls = 0;
    const flakySyncMiddleware = vi.fn(() => {
      calls += 1;
      if (calls === 1) {
        throw new Error('sync init failed');
      }
    });
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([flakySyncMiddleware], server);

    const event = createEventFixture();
    const context = createContextFixture();
    const callback = vi.fn();

    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('sync init failed');
    expect(flakySyncMiddleware).toHaveBeenCalledTimes(1);
    expect(mockHandler).not.toHaveBeenCalled();

    await wrappedHandler(event, context, callback);

    expect(flakySyncMiddleware).toHaveBeenCalledTimes(2);
    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(event, context, callback);
  });

  it('should share one init attempt across concurrent invocations and retry after failure', async () => {
    let calls = 0;
    const flakyAsyncMiddleware = vi.fn().mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error('async init failed');
      }
    });
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([flakyAsyncMiddleware], server);

    const event = createEventFixture();
    const context = createContextFixture();
    const callback = vi.fn();

    const [first, second] = await Promise.allSettled([
      wrappedHandler(event, context, callback),
      wrappedHandler(event, context, callback),
    ]);

    expect(first.status).toBe('rejected');
    expect(second.status).toBe('rejected');
    expect(flakyAsyncMiddleware).toHaveBeenCalledTimes(1);

    await wrappedHandler(event, context, callback);

    expect(flakyAsyncMiddleware).toHaveBeenCalledTimes(2);
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});

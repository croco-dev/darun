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

describe('createLambdaHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the original handler when all middlewares are sync', async () => {
    const syncMiddleware = vi.fn();
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);

    const wrappedHandler = createLambdaHandler([syncMiddleware], server);
    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();

    expect(wrappedHandler).not.toBe(mockHandler);

    await wrappedHandler(event, context, callback);

    expect(syncMiddleware).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(event, context, callback);
  });

  it('should return a wrapped handler that awaits async middlewares', async () => {
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

    expect(wrappedHandler).not.toBe(mockHandler);
    expect(asyncMiddleware).toHaveBeenCalledTimes(0);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();
    await wrappedHandler(event, context, callback);

    expect(middlewareResolved).toBe(true);
    expect(asyncMiddleware).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(event, context, callback);
  });

  it('should retry middleware on second call after first failure', async () => {
    const asyncMiddleware = vi.fn().mockRejectedValueOnce(new Error('init failed')).mockResolvedValueOnce(undefined);
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([asyncMiddleware], server);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();

    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('init failed');

    mockHandler.mockClear();

    await wrappedHandler(event, context, callback);

    expect(mockHandler).toHaveBeenCalledWith(event, context, callback);
    expect(asyncMiddleware).toHaveBeenCalledTimes(2);
  });

  it('should propagate error when middleware fails on both calls', async () => {
    const asyncMiddleware = vi.fn().mockRejectedValue(new Error('persistent failure'));
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([asyncMiddleware], server);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();

    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('persistent failure');
    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('persistent failure');
  });

  it('should not re-invoke middlewares after successful initialization', async () => {
    const asyncMiddleware = vi.fn().mockResolvedValue(undefined);
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([asyncMiddleware], server);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();

    await wrappedHandler(event, context, callback);
    await wrappedHandler(event, context, callback);

    expect(asyncMiddleware).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledTimes(2);
  });

  it('should share initialization promise across concurrent calls', async () => {
    const asyncMiddleware = vi.fn().mockResolvedValue(undefined);
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([asyncMiddleware], server);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();

    const [, ,] = await Promise.all([
      wrappedHandler(event, context, callback),
      wrappedHandler(event, context, callback),
    ]);

    expect(asyncMiddleware).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledTimes(2);
  });

  it('should propagate sync exception during retry middleware invocation', async () => {
    let callCount = 0;
    const flakyMiddleware = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('async fail'));
      }
      throw new Error('sync fail on retry');
    });
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([flakyMiddleware], server);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();

    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('async fail');
    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('sync fail on retry');
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should not reuse stale rejected promise from previous failed attempt', async () => {
    const asyncMiddleware = vi.fn().mockRejectedValue(new Error('always fails'));
    const { createLambdaHandler } = await import('../createLambdaHandler');
    const { ApolloServer } = await import('@apollo/server');
    const server = new ApolloServer({ schema: {} } as unknown as ConstructorParameters<typeof ApolloServer>[0]);
    mockHandler.mockResolvedValue({ statusCode: 200 });

    const wrappedHandler = createLambdaHandler([asyncMiddleware], server);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();

    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('always fails');
    await expect(wrappedHandler(event, context, callback)).rejects.toThrow('always fails');

    expect(asyncMiddleware).toHaveBeenCalledTimes(2);
    expect(mockHandler).not.toHaveBeenCalled();
  });
});

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

    const result = createLambdaHandler([syncMiddleware], server);

    expect(syncMiddleware).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockHandler);
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
    expect(asyncMiddleware).toHaveBeenCalledTimes(1);

    const event = {} as unknown as import('aws-lambda').APIGatewayProxyEventV2;
    const context = {} as unknown as import('aws-lambda').Context;
    const callback = vi.fn();
    await wrappedHandler(event, context, callback);

    expect(middlewareResolved).toBe(true);
    expect(mockHandler).toHaveBeenCalledWith(event, context, callback);
  });
});

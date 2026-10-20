import 'reflect-metadata';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@darun/utils-apollo-server', () => ({
  AuthRole: { Admin: 'Admin' },
  Connection: class Connection {},
  ConnectionArgs: class ConnectionArgs {},
  Cursor: { decode: vi.fn(), encode: vi.fn() },
  PageInfo: class PageInfo {},
}));

vi.mock('typedi', () => ({
  Inject: () => () => {},
  Service: () => () => {},
  Token: class Token {},
}));

vi.mock('type-graphql', () => {
  const methodDecorator = () => (_target: object, _key: string, descriptor: PropertyDescriptor) => descriptor;
  return {
    Arg: () => () => vi.fn(),
    Args: () => methodDecorator,
    ArgsType: () => () => {},
    Authorized: methodDecorator,
    Field: () => () => {},
    FieldResolver: methodDecorator,
    GraphQLISODateTime: class GraphQLISODateTime {},
    ID: class ID {},
    InputType: () => () => {},
    Int: class Int {},
    Mutation: methodDecorator,
    ObjectType: () => () => {},
    Query: methodDecorator,
    registerEnumType: () => {},
    Resolver: () => () => {},
    Root: () => () => {},
  };
});

describe('VisualUiElement graph exposure', () => {
  it('enum 값이 도메인 닫힌 집합과 일치한다', async () => {
    const [{ VisualUiElementGraph }, { VISUAL_UI_ELEMENTS }] = await Promise.all([
      import('../graphs/VisualUiElement'),
      import('@darun/products-domain'),
    ]);
    expect(Object.values(VisualUiElementGraph).sort()).toEqual([...VISUAL_UI_ELEMENTS].sort());
  });

  it('visualScreenshots 리졸버가 uiElements 인자를 usecase에 전달한다', async () => {
    const [{ VisualScreenshotQueryResolver }, { VisualUiElementGraph }] = await Promise.all([
      import('../VisualScreenshot.query.resolver'),
      import('../graphs/VisualUiElement'),
    ]);
    const execute = vi.fn().mockResolvedValue({
      screenshots: [],
      totalCount: 0,
      hasNextPage: false,
    });
    const resolver = new VisualScreenshotQueryResolver({ execute } as never, {} as never, {} as never);
    await resolver.visualScreenshots(
      null,
      null,
      null,
      [VisualUiElementGraph.CARD, VisualUiElementGraph.BUTTON],
      null,
      null,
      24,
      null,
      null
    );
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ uiElements: ['CARD', 'BUTTON'] }));
  });

  it('updateProductScreenshot 리졸버가 uiElements 입력을 usecase에 전달한다', async () => {
    const [{ ProductMediaMutationResolver }, { VisualUiElementGraph }] = await Promise.all([
      import('../ProductMediaMutationResolver'),
      import('../graphs/VisualUiElement'),
    ]);
    const updateProductScreenshot = {
      execute: vi.fn().mockResolvedValue({ id: 'screenshot-1' }),
    };
    const resolver = new ProductMediaMutationResolver(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      updateProductScreenshot as never,
      {} as never,
      {} as never,
      {} as never
    );
    await resolver.updateProductScreenshot({
      id: 'screenshot-1',
      imageAlt: '이미지',
      uiElements: [VisualUiElementGraph.CARD],
    });
    expect(updateProductScreenshot.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'screenshot-1', uiElements: ['CARD'] })
    );
  });
});

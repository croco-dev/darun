import { PageInfo } from '@darun/utils-apollo-server';
import { Field, ID, Int, ObjectType } from 'type-graphql';
import { Screenshot } from './Screenshot';

@ObjectType('VisualScreenshotFlow')
export class VisualScreenshotFlow {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => Int)
  stepCount: number;

  @Field(() => Screenshot)
  coverScreenshot: Screenshot;
}

@ObjectType('VisualScreenshotFlowEdge')
export class VisualScreenshotFlowEdge {
  @Field(() => String)
  cursor: string;

  @Field(() => VisualScreenshotFlow)
  node: VisualScreenshotFlow;
}

@ObjectType('VisualScreenshotFlowConnection')
export class VisualScreenshotFlowConnection {
  @Field(() => [VisualScreenshotFlowEdge])
  edges: VisualScreenshotFlowEdge[];

  @Field(() => PageInfo)
  pageInfo: PageInfo;
}

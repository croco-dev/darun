import { PageInfo } from '@darun/utils-apollo-server';
import { Field, Int, ObjectType } from 'type-graphql';
import { VisualScreenshot } from './VisualScreenshot';

@ObjectType()
export class VisualScreenshotConnection {
  @Field(() => Int)
  totalCount: number;

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [VisualScreenshotEdge])
  edges: VisualScreenshotEdge[];
}

@ObjectType()
export class VisualScreenshotEdge {
  @Field()
  cursor: string;

  @Field(() => VisualScreenshot)
  node: VisualScreenshot;
}

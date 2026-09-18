import { Field, Int, ObjectType } from 'type-graphql';
import { Screenshot } from './Screenshot';

@ObjectType({ description: '플로의 한 단계. position은 0부터 시작한다' })
export class VisualFlowStep {
  @Field(() => Int)
  position: number;

  @Field(() => String)
  caption: string;

  @Field(() => Screenshot)
  screenshot: Screenshot;
}

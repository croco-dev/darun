import { Field, Int, InputType, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType('PublishMagazinePayload')
export class PublishMagazinePayload {
  @Field(() => Magazine)
  magazine: Magazine;
}

@InputType('PublishMagazineInput')
export class PublishMagazineInput {
  @Field(() => Int)
  expectedRevision: number;

  @Field()
  slug: string;
}

import { Field, InputType, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType('PublishMagazinePayload')
export class PublishMagazinePayload {
  @Field(() => Magazine)
  magazine: Magazine;
}

@InputType('PublishMagazineInput')
export class PublishMagazineInput {
  @Field()
  slug: string;
}

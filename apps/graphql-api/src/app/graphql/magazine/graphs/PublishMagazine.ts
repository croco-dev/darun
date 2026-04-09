import { Field, InputType, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType()
export class PublishMagazinePayload {
  @Field()
  magazine: Magazine;
}

@InputType()
export class PublishMagazineInput {
  @Field()
  slug: string;
}

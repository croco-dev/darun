import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType('Feature')
export class Feature {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  emoji: string;

  @Field(() => String, { nullable: true })
  summary?: string;
}

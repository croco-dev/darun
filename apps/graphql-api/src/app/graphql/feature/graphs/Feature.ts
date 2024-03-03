import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Feature {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  summary?: string;
}

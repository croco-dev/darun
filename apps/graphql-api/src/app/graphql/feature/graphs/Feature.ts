import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Feature {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;
}

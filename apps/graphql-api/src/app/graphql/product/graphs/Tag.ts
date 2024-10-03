import { Field, ID, Int, ObjectType } from 'type-graphql';

@ObjectType()
export class Tag {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  count: number;
}

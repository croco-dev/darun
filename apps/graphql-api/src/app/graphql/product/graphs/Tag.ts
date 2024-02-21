import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Tag {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;
}

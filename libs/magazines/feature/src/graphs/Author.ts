import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType('Author')
export class Author {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;
}

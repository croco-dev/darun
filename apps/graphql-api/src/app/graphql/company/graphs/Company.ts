import { Field, GraphQLISODateTime, ID, ObjectType } from 'type-graphql';

@ObjectType()
export class Company {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  address: string;

  @Field(() => String)
  type: string;

  @Field(() => GraphQLISODateTime)
  startAt: Date;
}

import { ArgsType, Field, Int } from 'type-graphql';

@ArgsType()
export class ConnectionArgs {
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field({ nullable: true })
  after?: string;

  @Field(() => Int, { nullable: true })
  last?: number;

  @Field({ nullable: true })
  before?: string;
}

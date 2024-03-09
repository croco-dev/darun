import { ArgsType, Field } from 'type-graphql';

@ArgsType()
export class ConnectionArgs {
  @Field({ nullable: true })
  first?: number;

  @Field({ nullable: true })
  after?: string;

  @Field({ nullable: true })
  last?: number;

  @Field({ nullable: true })
  before?: string;
}

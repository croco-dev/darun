import { Field, GraphQLISODateTime, InputType, ObjectType } from 'type-graphql';
import { Company } from './Company';

@ObjectType()
export class CreateCompanyPayload {
  @Field(() => Company)
  company: Company;
}

@InputType()
export class CreateCompanyInput {
  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  address: string;

  @Field(() => GraphQLISODateTime)
  startAt: Date;
}

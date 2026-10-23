import { Field, GraphQLISODateTime, InputType, ObjectType } from 'type-graphql';
import { Company } from './Company';

@ObjectType('CreateCompanyPayload')
export class CreateCompanyPayload {
  @Field(() => Company)
  company: Company;
}

@InputType('CreateCompanyInput')
export class CreateCompanyInput {
  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  address: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  startAt?: Date;
}

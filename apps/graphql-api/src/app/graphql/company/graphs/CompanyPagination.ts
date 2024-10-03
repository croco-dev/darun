import { Field, Int, ObjectType } from 'type-graphql';
import { Company } from './Company';

@ObjectType()
export class CompanyPagination {
  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => [Company])
  companies: Company[];
}

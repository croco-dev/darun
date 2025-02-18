import { Field, Int, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType()
export class MagazinePagination {
  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  totalPages: number;

  @Field(() => [Magazine])
  magazines: Magazine[];
}

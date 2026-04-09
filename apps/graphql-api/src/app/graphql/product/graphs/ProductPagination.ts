import { Field, Int, ObjectType } from 'type-graphql';
import { PageInfo } from '../../common/PageInfo';
import { Product } from './Product';

@ObjectType()
export class ProductConnection {
  @Field(() => Int)
  totalCount: number;

  @Field(() => PageInfo)
  pageInfo: PageInfo;

  @Field(() => [ProductEdge])
  edges: ProductEdge[];
}

@ObjectType()
export class ProductEdge {
  @Field()
  cursor: string;

  @Field()
  node: Product;
}

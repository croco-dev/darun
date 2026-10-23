import { Field, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('UpvoteProductPayload')
export class UpvoteProductPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

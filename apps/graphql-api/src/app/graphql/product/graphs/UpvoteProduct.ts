import { Field, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class UpvoteProductPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

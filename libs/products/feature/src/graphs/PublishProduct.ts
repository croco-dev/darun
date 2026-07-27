import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class PublishProductPayload {
  @Field(() => Product)
  product: Product;
}

@InputType()
export class PublishProductInput {
  @Field()
  slug: string;
}

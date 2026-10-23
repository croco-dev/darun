import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('PublishProductPayload')
export class PublishProductPayload {
  @Field(() => Product)
  product: Product;
}

@InputType('PublishProductInput')
export class PublishProductInput {
  @Field()
  slug: string;
}

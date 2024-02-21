import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class CreateProductPayload {
  @Field(() => Product)
  product: Product;
}

@InputType()
export class CreateProductInput {
  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  summary: string;

  @Field()
  logoUrl: string;
}

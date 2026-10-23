import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('CreateProductPayload')
export class CreateProductPayload {
  @Field(() => Product)
  product: Product;
}

@InputType('CreateProductInput')
export class CreateProductInput {
  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  summary: string;

  @Field()
  logoUrl: string;

  @Field({ nullable: true })
  description?: string;
}

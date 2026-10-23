import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('EditProductPayload')
export class EditProductPayload {
  @Field(() => Product)
  product: Product;
}

@InputType('EditProductInput')
export class EditProductInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  summary?: string;

  @Field({ nullable: true })
  logoUrl?: string;

  @Field({ nullable: true })
  description?: string;
}

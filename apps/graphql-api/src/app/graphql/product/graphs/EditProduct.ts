import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class EditProductPayload {
  @Field(() => Product)
  product: Product;
}

@InputType()
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

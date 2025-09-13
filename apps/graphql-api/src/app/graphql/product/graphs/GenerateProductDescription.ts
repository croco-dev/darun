import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@InputType()
export class GenerateProductDescriptionInput {
  @Field(() => String)
  slug: string;
}

@ObjectType()
export class GenerateProductDescriptionPayload {
  @Field(() => Product)
  product: Product;
}

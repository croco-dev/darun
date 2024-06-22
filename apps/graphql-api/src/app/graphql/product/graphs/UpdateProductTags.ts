import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class UpdateProductTagsPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
export class UpdateProductTagsInput {
  @Field(() => [String])
  tagNames: string[];
}

import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class AddProductTagsPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
export class AddProductTagsInput {
  @Field(() => [String])
  tagNames: string[];
}

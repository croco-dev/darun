import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('UpdateProductTagsPayload')
export class UpdateProductTagsPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType('UpdateProductTagsInput')
export class UpdateProductTagsInput {
  @Field(() => [String])
  tagNames: string[];
}

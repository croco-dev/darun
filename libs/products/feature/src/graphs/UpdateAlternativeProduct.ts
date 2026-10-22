import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('UpdateAlternativeProductPayload')
export class UpdateAlternativeProductPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType('UpdateAlternativeProductInput')
export class UpdateAlternativeProductInput {
  @Field(() => [String])
  alternativeProductIds: string[];
}

import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class UpdateAlternativeProductPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
export class UpdateAlternativeProductInput {
  @Field(() => [String])
  alternativeProductIds: string[];
}

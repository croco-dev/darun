import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class AddAlternativeProductPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
export class AddAlternativeProductInput {
  @Field()
  alternativeProductId: string;
}

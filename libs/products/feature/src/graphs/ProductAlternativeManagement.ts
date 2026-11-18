import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('ProductAlternativeExclusion')
export class ProductAlternativeExclusion {
  @Field(() => String)
  alternativeProductId: string;

  @Field(() => String, { nullable: true })
  alternativeProductName: string | null;

  @Field(() => String, { nullable: true })
  note: string | null;
}

@ObjectType('ProductAlternativeManagement')
export class ProductAlternativeManagement {
  @Field(() => [Product])
  automatic: Product[];

  @Field(() => [ProductAlternativeExclusion])
  exclusions: ProductAlternativeExclusion[];
}

@InputType('SetProductAlternativeExclusionInput')
export class SetProductAlternativeExclusionInput {
  @Field(() => String)
  slug: string;

  @Field(() => String)
  alternativeProductId: string;

  @Field(() => Boolean)
  excluded: boolean;

  @Field(() => String, { nullable: true })
  note?: string | null;
}

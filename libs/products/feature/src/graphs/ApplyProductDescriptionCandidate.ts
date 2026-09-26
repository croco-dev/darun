import { Field, ObjectType } from 'type-graphql';
import { Product } from './Product';
import { ProductDescriptionJob } from './ProductDescriptionJob';

@ObjectType()
export class ApplyProductDescriptionCandidatePayload {
  @Field(() => Product)
  product: Product;

  @Field(() => ProductDescriptionJob)
  job: ProductDescriptionJob;
}

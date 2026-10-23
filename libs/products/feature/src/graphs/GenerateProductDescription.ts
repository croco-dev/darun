import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';
import { ProductDescriptionJob } from './ProductDescriptionJob';

@InputType('GenerateProductDescriptionInput')
export class GenerateProductDescriptionInput {
  @Field(() => String)
  slug: string;
}

@ObjectType('GenerateProductDescriptionPayload')
export class GenerateProductDescriptionPayload {
  @Field(() => Product)
  product: Product;

  @Field(() => ProductDescriptionJob, { nullable: true })
  job?: ProductDescriptionJob;
}

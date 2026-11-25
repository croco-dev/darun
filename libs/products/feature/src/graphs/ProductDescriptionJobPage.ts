import { Field, ObjectType } from 'type-graphql';
import { ProductDescriptionJob } from './ProductDescriptionJob';

@ObjectType('ProductDescriptionJobPage')
export class ProductDescriptionJobPage {
  @Field(() => [ProductDescriptionJob])
  jobs: ProductDescriptionJob[];

  @Field(() => String, { nullable: true })
  nextCursor?: string;
}

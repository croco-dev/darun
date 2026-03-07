import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType()
export class RegisterProductCompanyPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType()
export class RegisterProductCompanyInput {
  @Field(() => ID)
  companyId: string;
}

import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';

@ObjectType('RegisterProductCompanyPayload')
export class RegisterProductCompanyPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType('RegisterProductCompanyInput')
export class RegisterProductCompanyInput {
  @Field(() => ID)
  companyId: string;
}

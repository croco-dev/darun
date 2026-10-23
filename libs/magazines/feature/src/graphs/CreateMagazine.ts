import { Field, InputType, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType('CreateMagazinePayload')
export class CreateMagazinePayload {
  @Field(() => Magazine)
  magazine: Magazine;
}

@InputType('CreateMagazineInput')
export class CreateMagazineInput {
  @Field()
  title: string;

  @Field()
  backgroundImageUrl: string;

  @Field({ nullable: true })
  logoImageUrl?: string;

  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  summary?: string;
}

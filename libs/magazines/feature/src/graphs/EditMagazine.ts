import { Field, InputType, ObjectType } from 'type-graphql';
import { Magazine } from './Magazine';

@ObjectType('EditMagazinePayload')
export class EditMagazinePayload {
  @Field(() => Magazine)
  magazine: Magazine;
}

@InputType('EditMagazineInput')
export class EditMagazineInput {
  @Field({ nullable: true })
  slug?: string;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  backgroundImageUrl?: string;

  @Field({ nullable: true })
  logoImageUrl?: string;

  @Field({ nullable: true })
  summary?: string;

  @Field({ nullable: true })
  content?: string;
}

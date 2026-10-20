import { Field, ID, ObjectType } from 'type-graphql';

@ObjectType('Link', { description: 'Product에 등록한 서비스 링크. 공식 여부를 자동 인증하지 않는다.' })
export class Link {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  iconUrl: string;

  @Field(() => String)
  link: string;

  @Field(() => String)
  displayLink: string;

  @Field(() => Boolean)
  isPrimary: boolean;
}

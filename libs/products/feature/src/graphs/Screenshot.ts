import type { VisualPlatform, VisualScreenType } from '@darun/products-domain';
import { Field, ID, ObjectType } from 'type-graphql';
import { VisualPlatformGraph } from './VisualPlatform';
import { VisualScreenTypeGraph } from './VisualScreenType';

@ObjectType({ description: '제품 스크린샷' })
export class Screenshot {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  imageUrl: string;

  @Field(() => String)
  imageAlt: string;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => VisualPlatformGraph, { nullable: true })
  platform?: VisualPlatform | null;

  @Field(() => VisualScreenTypeGraph, { nullable: true })
  screenType?: VisualScreenType | null;
}

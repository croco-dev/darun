import type { VisualPlatform, VisualScreenType } from '@darun/products-domain';
import { Field, ID, ObjectType } from 'type-graphql';
import { Product } from './Product';
import { VisualFlow } from './VisualFlow';
import { VisualPlatformGraph } from './VisualPlatform';
import { VisualScreenTypeGraph } from './VisualScreenType';

@ObjectType({ description: '공개 제품에 속한 스크린샷과 제품 정보' })
export class VisualScreenshot {
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

  @Field(() => Product)
  product: Product;

  @Field(() => [VisualFlow])
  flows: VisualFlow[];
}

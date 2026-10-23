import { Field, InputType, ObjectType } from 'type-graphql';
import { Product } from './Product';
import { VisualPlatformGraph } from './VisualPlatform';
import { VisualScreenTypeGraph } from './VisualScreenType';

@ObjectType('AddProductScreenshotPayload')
export class AddProductScreenshotPayload {
  @Field(() => Product, { nullable: true })
  product: Product | null;
}

@InputType('AddProductScreenshotInput')
export class AddProductScreenshotInput {
  @Field()
  imageUrl: string;

  @Field()
  imageAlt: string;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => VisualPlatformGraph, { nullable: true })
  platform?: string | null;

  @Field(() => VisualScreenTypeGraph, { nullable: true })
  screenType?: string | null;
}

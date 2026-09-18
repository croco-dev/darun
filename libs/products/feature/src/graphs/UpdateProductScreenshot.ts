import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { Screenshot } from './Screenshot';
import { VisualPlatformGraph } from './VisualPlatform';
import { VisualScreenTypeGraph } from './VisualScreenType';

@ObjectType()
export class UpdateProductScreenshotPayload {
  @Field(() => Screenshot)
  screenshot: Screenshot;
}

@InputType()
export class UpdateProductScreenshotInput {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  imageAlt: string;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => VisualPlatformGraph, { nullable: true })
  platform?: string | null;

  @Field(() => VisualScreenTypeGraph, { nullable: true })
  screenType?: string | null;
}

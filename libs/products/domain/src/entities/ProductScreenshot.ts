import type { VisualPlatform, VisualScreenType } from './VisualClassification';

export class ProductScreenshot {
  public id: string;
  public imageUrl: string;
  public imageAlt: string;
  public productId: string;
  public title?: string | null;
  public platform?: VisualPlatform | null;
  public screenType?: VisualScreenType | null;

  constructor({
    id,
    imageUrl,
    imageAlt,
    productId,
    title,
    platform,
    screenType,
  }: {
    id?: string;
    imageUrl: string;
    imageAlt: string;
    productId: string;
    title?: string | null;
    platform?: VisualPlatform | null;
    screenType?: VisualScreenType | null;
  }) {
    this.imageUrl = imageUrl;
    this.imageAlt = imageAlt;
    this.productId = productId;
    this.title = title ?? null;
    this.platform = platform ?? null;
    this.screenType = screenType ?? null;

    if (id) {
      this.id = id;
    }
  }
}

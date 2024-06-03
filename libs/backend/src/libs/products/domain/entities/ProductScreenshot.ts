export class ProductScreenshot {
  public id: string;
  public imageUrl: string;
  public imageAlt: string;
  public productId: string;

  constructor({
    id,
    imageUrl,
    imageAlt,
    productId,
  }: {
    id?: string;
    imageUrl: string;
    imageAlt: string;
    productId: string;
  }) {
    this.imageUrl = imageUrl;
    this.imageAlt = imageAlt;
    this.productId = productId;

    if (id) {
      this.id = id;
    }
  }
}

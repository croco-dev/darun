export class AlternativeProduct {
  public id: string;
  public productId: string;
  public alternativeProductId: string;

  constructor({
    id,
    productId,
    alternativeProductId,
  }: {
    id?: string;
    productId: string;
    alternativeProductId: string;
  }) {
    this.productId = productId;
    this.alternativeProductId = alternativeProductId;

    if (id) {
      this.id = id;
    }
  }
}

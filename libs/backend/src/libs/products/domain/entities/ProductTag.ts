import { ProductTagType } from './ProductTagType';

export class ProductTag {
  public id: string;
  public name: string;
  public type: ProductTagType;
  public productId: string;

  constructor({ id, name, type, productId }: { id?: string; name: string; type?: ProductTagType; productId: string }) {
    this.name = name;
    this.type = type ?? ProductTagType.Simple;
    this.productId = productId;

    if (id) {
      this.id = id;
    }
  }
}

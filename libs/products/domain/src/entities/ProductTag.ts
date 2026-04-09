import { Tag } from './Tag';

export class ProductTag {
  public productId: string;
  public tags: Tag[];

  constructor({ tags, productId }: { tags: Tag[]; productId: string }) {
    this.productId = productId;
    this.tags = tags;
  }
}

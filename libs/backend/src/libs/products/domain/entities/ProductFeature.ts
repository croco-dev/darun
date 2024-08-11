export class ProductFeature {
  public id: string;
  public name: string;
  public summary: string | null;
  public emoji: string;
  public productId: string;

  constructor({
    id,
    name,
    summary,
    emoji,
    productId,
  }: {
    id?: string;
    name: string;
    summary: string | null;
    emoji: string;
    productId: string;
  }) {
    this.name = name;
    this.summary = summary;
    this.emoji = emoji;
    this.productId = productId;

    if (id) {
      this.id = id;
    }
  }

  public update({ name, summary, emoji }: { name?: string; summary?: string | null; emoji?: string }) {
    if (name) {
      this.name = name;
    }
    if (summary) {
      this.summary = summary;
    }
    if (emoji) {
      this.emoji = emoji;
    }
  }
}

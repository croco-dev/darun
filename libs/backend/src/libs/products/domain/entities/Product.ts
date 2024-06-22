export class Product {
  public id: string;
  public name: string;
  public slug: string;
  public summary: string;
  public description?: string;
  public logoUrl: string;
  public publishedAt?: Date;

  constructor({
    id,
    slug,
    name,
    summary,
    logoUrl,
    description,
    publishedAt,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
    logoUrl: string;
    publishedAt?: Date;
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;
    this.logoUrl = logoUrl;
    this.publishedAt = publishedAt;

    if (id) {
      this.id = id;
    }
  }

  public publish() {
    this.publishedAt = new Date();
  }
}

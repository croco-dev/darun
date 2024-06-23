export class Product {
  public id: string;
  public name: string;
  public slug: string;
  public summary: string;
  public description?: string;
  public logoUrl: string;
  public publishedAt?: Date;
  public updatedAt?: Date;

  constructor({
    id,
    slug,
    name,
    summary,
    logoUrl,
    description,
    publishedAt,
    updatedAt,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
    logoUrl: string;
    publishedAt?: Date;
    updatedAt?: Date;
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;
    this.logoUrl = logoUrl;
    this.publishedAt = publishedAt;
    this.updatedAt = updatedAt;

    if (id) {
      this.id = id;
    }
  }

  public publish() {
    this.publishedAt = new Date();
  }
}

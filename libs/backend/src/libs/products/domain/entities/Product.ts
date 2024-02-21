export class Product {
  public id: string;
  public name: string;
  public slug: string;
  public summary: string;
  public description: string | null;
  public logoUrl: string;

  constructor({
    id,
    slug,
    name,
    summary,
    logoUrl,
    description,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
    logoUrl: string;
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description ?? null;
    this.logoUrl = logoUrl;

    if (id) {
      this.id = id;
    }
  }
}

export class SearchableProduct {
  public id: string;
  public slug: string;
  public name: string;
  public summary: string;
  public description?: string;

  constructor({
    id,
    slug,
    name,
    summary,
    description,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;

    if (id) {
      this.id = id;
    }
  }
}

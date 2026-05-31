export class SearchableProduct {
  public id: string;
  public slug: string;
  public name: string;
  public summary: string;
  public description?: string;
  public tags: string[] = [];
  public category: string = '';
  public searchScore?: number;

  constructor({
    id,
    slug,
    name,
    summary,
    description,
    tags = [],
    category = '',
    searchScore,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
    tags?: string[];
    category?: string;
    searchScore?: number;
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;
    this.tags = tags;
    this.category = category;
    this.searchScore = searchScore;

    if (id) {
      this.id = id;
    }
  }
}

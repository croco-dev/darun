export class SearchableProduct {
  public id: string;
  public slug: string;
  public name: string;
  public summary: string;
  public description?: string;
  public tags: string[] = [];
  public category: string = '';
  public searchScore?: number;
  public votes?: number;
  public createdAt?: Date;
  public publishedAt?: Date;

  constructor({
    id,
    slug,
    name,
    summary,
    description,
    tags = [],
    category = '',
    searchScore,
    votes,
    createdAt,
    publishedAt,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
    tags?: string[];
    category?: string;
    searchScore?: number;
    votes?: number;
    createdAt?: Date;
    publishedAt?: Date;
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;
    this.tags = tags;
    this.category = category;
    this.searchScore = searchScore;
    this.votes = votes;
    this.createdAt = createdAt;
    this.publishedAt = publishedAt;

    if (id) {
      this.id = id;
    }
  }
}

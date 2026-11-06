export class SearchableProduct {
  public id: string;
  public slug: string;
  public name: string;
  public summary: string;
  public description?: string;
  public tags: string[] = [];
  public category: string = '';
  public categoryText: string[] = [];
  public searchScore?: number;
  public votes?: number;
  public createdAt?: Date;
  public publishedAt?: Date;
  public sourceRevision?: string;

  constructor({
    id,
    slug,
    name,
    summary,
    description,
    tags = [],
    category = '',
    categoryText = [],
    searchScore,
    votes,
    createdAt,
    publishedAt,
    sourceRevision,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
    tags?: string[];
    category?: string;
    categoryText?: string[];
    searchScore?: number;
    votes?: number;
    createdAt?: Date;
    publishedAt?: Date;
    sourceRevision?: string;
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;
    this.tags = tags;
    this.category = category;
    this.categoryText = categoryText;
    this.searchScore = searchScore;
    this.votes = votes;
    this.createdAt = createdAt;
    this.publishedAt = publishedAt;
    this.sourceRevision = sourceRevision;

    if (id) {
      this.id = id;
    }
  }
}

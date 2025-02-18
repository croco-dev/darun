export class Magazine {
  public id: string;
  public slug: string;
  public title: string;
  public description?: string;
  public backgroundImageUrl: string;
  public logoImageUrl?: string;
  public publishedAt?: Date;
  public updatedAt?: Date;
  public authorId: string;

  constructor({
    id,
    slug,
    title,
    description,
    backgroundImageUrl,
    logoImageUrl,
    publishedAt,
    updatedAt,
    authorId,
  }: {
    id?: string;
    slug?: string;
    title: string;
    description?: string;
    backgroundImageUrl: string;
    logoImageUrl?: string;
    publishedAt?: Date;
    updatedAt?: Date;
    authorId: string;
  }) {
    this.slug = slug ?? title.toLowerCase().replace(/ /g, '-');
    this.title = title;
    this.description = description;
    this.backgroundImageUrl = backgroundImageUrl;
    this.logoImageUrl = logoImageUrl;
    this.publishedAt = publishedAt;
    this.updatedAt = updatedAt;
    this.authorId = authorId;

    if (id) {
      this.id = id;
    }
  }

  public publish() {
    this.publishedAt = new Date();
  }
}

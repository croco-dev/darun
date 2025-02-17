export class Magazine {
  public id: string;
  public slug: string;
  public title: string;
  public description?: string;
  public backgroundImageUrl: string;
  public publishedAt?: Date;
  public updatedAt?: Date;

  constructor({
    id,
    slug,
    title,
    description,
    backgroundImageUrl,
    publishedAt,
    updatedAt,
  }: {
    id?: string;
    slug?: string;
    title: string;
    description?: string;
    backgroundImageUrl: string;
    publishedAt?: Date;
    updatedAt?: Date;
  }) {
    this.slug = slug ?? title.toLowerCase().replace(/ /g, '-');
    this.title = title;
    this.description = description;
    this.backgroundImageUrl = backgroundImageUrl;
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

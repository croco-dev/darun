export class Magazine {
  public id: string;
  public slug: string;
  public title: string;
  public summary?: string;
  public content?: string;
  public backgroundImageUrl: string;
  public logoImageUrl?: string;
  public publishedAt?: Date;
  public updatedAt?: Date;
  public authorId: string;

  constructor({
    id,
    slug,
    title,
    summary,
    content,
    backgroundImageUrl,
    logoImageUrl,
    publishedAt,
    updatedAt,
    authorId,
  }: {
    id?: string;
    slug?: string;
    title: string;
    summary?: string;
    content?: string;
    backgroundImageUrl: string;
    logoImageUrl?: string;
    publishedAt?: Date;
    updatedAt?: Date;
    authorId: string;
  }) {
    this.slug = slug ?? title.toLowerCase().replace(/ /g, '-');
    this.title = title;
    this.summary = summary;
    this.content = content;
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

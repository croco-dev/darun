export class Magazine {
  public id: string;
  public revision: number;
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
    revision = 0,
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
    revision?: number;
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
    this.revision = revision;
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
    this.publishedAt ??= new Date();
  }

  update({
    slug,
    title,
    summary,
    content,
    backgroundImageUrl,
    logoImageUrl,
  }: {
    slug?: string;
    title?: string;
    summary?: string;
    content?: string;
    backgroundImageUrl?: string;
    logoImageUrl?: string;
  }) {
    if (slug !== undefined) {
      this.slug = slug;
    }

    if (title !== undefined) {
      this.title = title;
    }

    if (summary !== undefined) {
      this.summary = summary;
    }

    if (content !== undefined) {
      this.content = content;
    }

    if (backgroundImageUrl !== undefined) {
      this.backgroundImageUrl = backgroundImageUrl;
    }

    if (logoImageUrl !== undefined) {
      this.logoImageUrl = logoImageUrl;
    }

    this.updatedAt = new Date();
  }
}

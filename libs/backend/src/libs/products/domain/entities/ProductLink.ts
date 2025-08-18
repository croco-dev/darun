export class ProductLink {
  public id: string;
  public title: string;
  public link: string;
  public displayLink: string;
  public iconUrl: string;
  public productId: string;

  constructor({
    id,
    title,
    link,
    displayLink,
    iconUrl,
    productId,
  }: {
    id?: string;
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
    productId: string;
  }) {
    this.title = title;
    this.link = link;
    this.displayLink = displayLink;
    this.iconUrl = iconUrl;
    this.productId = productId;

    if (id) {
      this.id = id;
    }
  }

  public update({
    title,
    link,
    displayLink,
    iconUrl,
  }: {
    title?: string;
    link?: string;
    displayLink?: string;
    iconUrl?: string;
  }) {
    if (title) {
      this.title = title;
    }
    if (link) {
      this.link = link;
    }
    if (displayLink) {
      this.displayLink = displayLink;
    }
    if (iconUrl) {
      this.iconUrl = iconUrl;
    }
  }
}

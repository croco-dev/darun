export class ProductLink {
  public id: string;
  public title: string;
  public link: string;
  public displayLink: string;
  public iconUrl: string;

  constructor({
    id,
    title,
    link,
    displayLink,
    iconUrl,
  }: {
    id?: string;
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
  }) {
    this.title = title;
    this.link = link;
    this.displayLink = displayLink;
    this.iconUrl = iconUrl;

    if (id) {
      this.id = id;
    }
  }
}

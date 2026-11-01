import { productInvalidArgs } from '../errors/productError';
import { isProductLinkUrl } from '../link/ProductLinkUrl';

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
    if (link !== undefined && !isProductLinkUrl(link)) throw productInvalidArgs('완전한 HTTP(S) URL을 입력해주세요.');
    if (title !== undefined) {
      this.title = title;
    }
    if (link !== undefined) {
      this.link = link;
    }
    if (displayLink !== undefined) {
      this.displayLink = displayLink;
    }
    if (iconUrl !== undefined) {
      this.iconUrl = iconUrl;
    }
  }
}

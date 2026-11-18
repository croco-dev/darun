import { productInvalidArgs } from '../errors/productError';
import type { ProductLinkRole } from '../link/ProductLinkRole';
import { isProductLinkUrl } from '../link/ProductLinkUrl';

export class ProductLink {
  public id: string;
  public title: string;
  public link: string;
  public displayLink: string;
  public iconUrl: string;
  public productId: string;
  public role: ProductLinkRole | null;
  public isDesignatedPrimary: boolean;

  constructor({
    id,
    title,
    link,
    displayLink,
    iconUrl,
    productId,
    role = null,
    isDesignatedPrimary = false,
  }: {
    id?: string;
    title: string;
    link: string;
    displayLink: string;
    iconUrl: string;
    productId: string;
    role?: ProductLinkRole | null;
    isDesignatedPrimary?: boolean;
  }) {
    this.title = title;
    this.link = link;
    this.displayLink = displayLink;
    this.iconUrl = iconUrl;
    this.productId = productId;
    this.role = role;
    this.isDesignatedPrimary = isDesignatedPrimary;

    if (id) {
      this.id = id;
    }
  }

  public update({
    title,
    link,
    displayLink,
    iconUrl,
    role,
    makePrimary,
  }: {
    title?: string;
    link?: string;
    displayLink?: string;
    iconUrl?: string;
    role?: ProductLinkRole | null;
    makePrimary?: boolean | null;
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
    if (role !== undefined) {
      this.role = role;
    }
    if (makePrimary) {
      this.isDesignatedPrimary = true;
    }
  }
}

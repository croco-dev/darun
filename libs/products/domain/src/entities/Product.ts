export class Product {
  public id: string;
  public name: string;
  public slug: string;
  public summary: string;
  public description?: string;
  public logoUrl: string;
  public publishedAt?: Date;
  public updatedAt?: Date;
  public ownedCompanyId?: string;
  public categoryIds: string[];

  constructor({
    id,
    slug,
    name,
    summary,
    logoUrl,
    description,
    publishedAt,
    updatedAt,
    ownedCompanyId,
    categoryIds,
  }: {
    id?: string;
    slug: string;
    name: string;
    summary: string;
    description?: string;
    logoUrl: string;
    publishedAt?: Date;
    updatedAt?: Date;
    ownedCompanyId?: string;
    categoryIds?: string[];
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;
    this.logoUrl = logoUrl;
    this.publishedAt = publishedAt;
    this.updatedAt = updatedAt;
    this.ownedCompanyId = ownedCompanyId;
    this.categoryIds = categoryIds ?? [];

    if (id) {
      this.id = id;
    }
  }

  public publish() {
    this.publishedAt = new Date();
  }

  public update({
    name,
    summary,
    logoUrl,
    description,
    categoryIds,
  }: {
    name?: string;
    summary?: string;
    description?: string;
    logoUrl?: string;
    categoryIds?: string[];
  }) {
    if (name !== undefined) {
      this.name = name;
    }
    if (summary !== undefined) {
      this.summary = summary;
    }
    if (description !== undefined) {
      this.description = description;
    }
    if (logoUrl !== undefined) {
      this.logoUrl = logoUrl;
    }
    if (categoryIds !== undefined) {
      this.categoryIds = categoryIds;
    }

    this.updatedAt = new Date();
  }

  registerCompany(companyId: string) {
    this.ownedCompanyId = companyId;
  }
}

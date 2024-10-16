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
  }) {
    this.slug = slug;
    this.name = name;
    this.summary = summary;
    this.description = description;
    this.logoUrl = logoUrl;
    this.publishedAt = publishedAt;
    this.updatedAt = updatedAt;
    this.ownedCompanyId = ownedCompanyId;

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
  }: {
    name?: string;
    summary?: string;
    description?: string;
    logoUrl?: string;
  }) {
    if (name) {
      this.name = name;
    }
    if (summary) {
      this.summary = summary;
    }
    if (description) {
      this.description = description;
    }
    if (logoUrl) {
      this.logoUrl = logoUrl;
    }

    this.updatedAt = new Date();
  }

  registerCompany(companyId: string) {
    this.ownedCompanyId = companyId;
  }
}

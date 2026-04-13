export class Category {
  public id: string;
  public slug: string;
  public labelKo: string;
  public labelEn: string;
  public createdAt?: Date;
  public updatedAt?: Date;

  constructor({
    id,
    slug,
    labelKo,
    labelEn,
    createdAt,
    updatedAt,
  }: {
    id?: string;
    slug: string;
    labelKo: string;
    labelEn: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.slug = slug;
    this.labelKo = labelKo;
    this.labelEn = labelEn;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;

    if (id) {
      this.id = id;
    }
  }

  public update({ labelKo, labelEn }: { labelKo?: string; labelEn?: string }) {
    if (labelKo !== undefined) {
      this.labelKo = labelKo;
    }
    if (labelEn !== undefined) {
      this.labelEn = labelEn;
    }
    this.updatedAt = new Date();
  }
}

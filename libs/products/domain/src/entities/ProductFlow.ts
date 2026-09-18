export type ProductFlowStep = {
  screenshotId: string;
  caption: string;
};

export class ProductFlow {
  public id: string;
  public productId: string;
  public title: string;
  public description: string;
  public platform: string;
  public flowType: string;
  public steps: ProductFlowStep[];

  constructor({
    id,
    productId,
    title,
    description,
    platform,
    flowType,
    steps,
  }: {
    id?: string;
    productId: string;
    title: string;
    description: string;
    platform: string;
    flowType: string;
    steps: ProductFlowStep[];
  }) {
    this.productId = productId;
    this.title = title;
    this.description = description;
    this.platform = platform;
    this.flowType = flowType;
    this.steps = steps;

    if (id) {
      this.id = id;
    }
  }
}

export class Company {
  public id: string;
  public name: string;
  public address: string;
  public type: string;
  public size: string;
  public region: string;
  public startAt: Date;

  constructor({
    id,
    name,
    address,
    type,
    size,
    region,
    startAt,
  }: {
    id?: string;
    name: string;
    address: string;
    type: string;
    size: string;
    region: string;
    startAt: Date;
  }) {
    this.name = name;
    this.address = address;
    this.type = type;
    this.size = size;
    this.region = region;
    this.startAt = startAt;

    if (id) {
      this.id = id;
    }
  }
}

export class Company {
  public id: string;
  public name: string;
  public address: string;
  public type: string;
  public startAt?: Date;

  constructor({
    id,
    name,
    address,
    type,
    startAt,
  }: {
    id?: string;
    name: string;
    address: string;
    type: string;
    startAt?: Date;
  }) {
    this.name = name;
    this.address = address;
    this.type = type;
    this.startAt = startAt;

    if (id) {
      this.id = id;
    }
  }
}

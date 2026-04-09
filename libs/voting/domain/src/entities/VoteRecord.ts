export class VoteRecord {
  constructor(
    public id: string,
    public targetId: string,
    public voterIpHash: string,
    public createdAt: Date
  ) {}
}

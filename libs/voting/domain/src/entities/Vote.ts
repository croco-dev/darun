export class Vote {
  public id: string;
  public targetId: string;
  public count: number;

  constructor({ id, targetId, count }: { id?: string; targetId: string; count?: number }) {
    this.targetId = targetId;
    this.count = count ?? 0;

    if (id) {
      this.id = id;
    }
  }

  upvote() {
    this.count++;
  }
}

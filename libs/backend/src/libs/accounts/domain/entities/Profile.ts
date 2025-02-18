export class Profile {
  public id: string;
  public displayName: string;

  constructor({ id, displayName }: { id?: string; displayName?: string }) {
    this.displayName = displayName ?? '-';

    if (id) {
      this.id = id;
    }
  }
}

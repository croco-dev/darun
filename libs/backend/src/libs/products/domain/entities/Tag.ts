import { TagType } from './TagType';

export class Tag {
  public id: string;
  public name: string;
  public type: TagType;
  public count: number;

  constructor({ id, name, type, count }: { id?: string; name: string; type?: TagType; count?: number }) {
    this.name = name;
    this.type = type ?? TagType.Simple;
    this.count = count ?? 0;

    if (id) {
      this.id = id;
    }
  }
}

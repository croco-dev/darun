import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import * as mongoose from 'mongoose';
import { ObjectId } from 'mongoose';

@modelOptions({
  existingMongoose: mongoose,
  schemaOptions: {
    collection: 'searchableProducts',
  },
})
export class SearchableProductSchema {
  public _id: ObjectId;

  @prop({ type: () => String })
  public productId: string;

  @prop({ type: () => String })
  public name: string;

  @prop({ type: () => String })
  public slug: string;

  @prop({ type: () => String })
  public summary: string;

  @prop({ type: () => String })
  public description?: string;

  @prop({ type: () => [String], default: [] })
  public tags: string[];

  @prop({ type: () => String, default: '' })
  public category: string;

  @prop({ type: () => Number, default: 0 })
  public votes: number;

  @prop({ type: () => Date })
  public createdAt?: Date;

  @prop({ type: () => Date })
  public publishedAt?: Date;
}

export const SearchableProductModel = getModelForClass(SearchableProductSchema);

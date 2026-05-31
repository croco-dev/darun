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

  @prop()
  public productId: string;

  @prop()
  public name: string;

  @prop()
  public slug: string;

  @prop()
  public summary: string;

  @prop()
  public description?: string;

  @prop({ type: () => [String], default: [] })
  public tags: string[];

  @prop({ default: '' })
  public category: string;
}

export const SearchableProductModel = getModelForClass(SearchableProductSchema);

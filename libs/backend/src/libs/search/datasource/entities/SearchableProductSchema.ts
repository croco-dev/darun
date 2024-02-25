import { getModelForClass, modelOptions, prop } from '@typegoose/typegoose';
import * as mongoose from 'mongoose';
import { ObjectId } from 'mongoose';

@modelOptions({
  existingMongoose: mongoose,
  schemaOptions: {
    collection: 'searchableProducts',
  },
})
class SearchableProductSchema {
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
}

export const SearchableProductModel = getModelForClass(SearchableProductSchema);

import { Connection } from 'mongoose';
import { Token } from 'typedi';

export type Mongoose = Connection;
export const MongooseToken = new Token<Mongoose>('MongooseToken');

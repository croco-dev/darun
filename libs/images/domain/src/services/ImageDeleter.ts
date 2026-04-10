import { Token } from "typedi";

export interface ImageDeleter {
  delete(imageUrl: string): Promise<void>;
}

export const ImageDeleterToken = new Token<ImageDeleter>("ImageDeleter");

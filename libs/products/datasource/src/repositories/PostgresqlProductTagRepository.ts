import { ProductTagRepository } from '@darun/products-domain';
import { ProductTag, ProductTagRepositoryToken, Tag, TagType } from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { eq, inArray } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { productTags } from '../entities/ProductTagsSchema';
import { tags } from '../entities/TagSchema';
import { beginProductContentWrite } from './productContentSync';

@Service(ProductTagRepositoryToken)
export class PostgresqlProductTagRepository implements ProductTagRepository {
  private readonly loader = new DataLoader<string, ProductTag | null>(
    async ids => {
      const rows = await this.findByProductIds(ids);
      const byId = new Map(rows.map(row => [row.productId, row]));
      return ids.map(id => byId.get(id) ?? null);
    },
    { cache: false }
  );
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  upsert(productTag: ProductTag): Promise<ProductTag> {
    return this.db.transaction(async tx => {
      const finishContentWrite = await beginProductContentWrite(tx, productTag.productId);
      const existTags = await tx
        .select()
        .from(tags)
        .where(
          inArray(
            tags.name,
            productTag.tags.map(tag => tag.name)
          )
        );
      const newTagValues = productTag.tags.filter(tag => !existTags.find(t => t.name === tag.name));
      const newTags = newTagValues.length > 0 ? await tx.insert(tags).values(newTagValues).returning() : [];
      const totalTags = [...existTags, ...newTags];

      const prevProductTags = await tx
        .select()
        .from(productTags)
        .where(eq(productTags.productId, productTag.productId));

      const addProductTags = totalTags.filter(tag => !prevProductTags.find(pt => pt.tagId === tag.id));
      const deleteProductTags = prevProductTags.filter(pt => !totalTags.find(t => pt.tagId === t.id));

      if (addProductTags.length > 0) {
        await tx.insert(productTags).values(
          addProductTags.map(tag => ({
            productId: productTag.productId,
            tagId: tag.id,
          }))
        );
      }

      if (deleteProductTags.length > 0) {
        await tx.delete(productTags).where(
          inArray(
            productTags.id,
            deleteProductTags.map(pt => pt.id)
          )
        );
      }

      await finishContentWrite();
      return new ProductTag({
        productId: productTag.productId,
        tags: totalTags.map(this.toTag),
      });
    });
  }

  async findOneByProductId(productId: string): Promise<ProductTag | null> {
    return this.loader.load(productId);
  }

  async findByProductIds(productIds: readonly string[]): Promise<readonly ProductTag[]> {
    if (productIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(productTags)
      .innerJoin(tags, eq(productTags.tagId, tags.id))
      .where(inArray(productTags.productId, [...productIds]));

    const tagsByProductId = new Map<string, Tag[]>();
    for (const row of rows) {
      const pid = row.product_tags.productId;
      const list = tagsByProductId.get(pid) ?? [];
      list.push(this.toTag(row.tags));
      tagsByProductId.set(pid, list);
    }

    return [...tagsByProductId.entries()].map(([productId, tags]) => this.mapper(productId, tags));
  }

  private mapper(productId: string, tags: Tag[]): ProductTag {
    return new ProductTag({
      productId,
      tags,
    });
  }

  private toTag(schema: typeof tags.$inferSelect | typeof tags.$inferInsert): Tag {
    return new Tag({
      ...schema,
      type: TagType[schema.type as keyof typeof TagType],
    });
  }
}

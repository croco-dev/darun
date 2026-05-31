import { ProductTagRepository } from '@darun/products-domain';
import { ProductTag, ProductTagRepositoryToken, Tag, TagType } from '@darun/products-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { eq, inArray } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { productTags } from '../entities/ProductTagsSchema';
import { tags } from '../entities/TagSchema';

@Service(ProductTagRepositoryToken)
export class PostgresqlProductTagRepository implements ProductTagRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  upsert(productTag: ProductTag): Promise<ProductTag> {
    return this.db.transaction(async tx => {
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

      return new ProductTag({
        productId: productTag.productId,
        tags: totalTags.map(this.toTag),
      });
    });
  }

  async findOneByProductId(productId: string): Promise<ProductTag | null> {
    const rows = await this.db
      .select()
      .from(productTags)
      .innerJoin(tags, eq(productTags.tagId, tags.id))
      .where(eq(productTags.productId, productId));

    return rows[0]?.product_tags
      ? this.mapper(
          rows[0].product_tags.productId,
          rows.map(({ tags }) => this.toTag(tags))
        )
      : null;
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

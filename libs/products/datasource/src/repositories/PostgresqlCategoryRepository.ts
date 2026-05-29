import { CategoryRepository } from '@darun/products-domain';
import { Category, CategoryRepositoryToken, productCategoryNotFound, productUpdateFailed } from '@darun/products-domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { eq, inArray } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { categories } from '../entities/CategorySchema';

@Service(CategoryRepositoryToken)
export class PostgresqlCategoryRepository implements CategoryRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async findOneBySlug(slug: string): Promise<Category | null> {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findOneById(id: string): Promise<Category | null> {
    return this.db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findAll(): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .orderBy(categories.labelKo)
      .then(rows => rows.map(row => this.mapper(row)));
  }

  async insert(values: Category): Promise<Category | null> {
    const inserted = await this.db
      .insert(categories)
      .values({ ...values })
      .returning();

    return inserted[0] ? this.mapper(inserted[0]) : null;
  }

  async updateById(id: string, modifier: (category: Category) => Category): Promise<Category> {
    return this.db.transaction(async tx => {
      const prevCategory = await tx
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1)
        .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

      if (!prevCategory) {
        throw productCategoryNotFound();
      }

      const updated = await tx
        .update(categories)
        .set({ ...modifier(prevCategory), updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();

      if (!updated[0]) {
        throw productUpdateFailed();
      }

      return this.mapper(updated[0]);
    });
  }

  async findByIds(ids: string[]): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(inArray(categories.id, ids))
      .then(rows => rows.map(row => this.mapper(row)));
  }

  private mapper<CategoryType extends typeof categories.$inferSelect | typeof categories.$inferInsert>(
    schema: CategoryType
  ): Category {
    return new Category({
      ...schema,
      labelKo: schema.labelKo,
      labelEn: schema.labelEn,
      createdAt: schema.createdAt ?? undefined,
      updatedAt: schema.updatedAt ?? undefined,
    });
  }
}

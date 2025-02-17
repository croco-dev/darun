import { Drizzle, DrizzleToken } from '@darun/provider-database';
import { Magazine, MagazineRepository, MagazineRepositoryToken } from '@magazine/domain';
import { and, eq, isNotNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { magazines } from '../entities/MagazineSchema';

@Service(MagazineRepositoryToken)
export class PostgresqlMagazineRepository implements MagazineRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async findPublishedOneBySlug(slug: string): Promise<Magazine | null> {
    return this.db
      .select()
      .from(magazines)
      .where(and(eq(magazines.slug, slug), isNotNull(magazines.publishedAt)))
      .limit(1)
      .then(result => this.mapper(result[0]));
  }

  async insert(values: Magazine): Promise<Magazine | null> {
    return this.db.transaction(async tx => {
      const inserted = await tx
        .insert(magazines)
        .values({ ...values })
        .returning();

      return inserted[0] ? this.mapper(inserted[0]) : null;
    });
  }

  private mapper<MagazineType extends typeof magazines.$inferSelect | typeof magazines.$inferInsert>(
    schema: MagazineType
  ): Magazine {
    return new Magazine({
      ...schema,
      description: schema.description ?? undefined,
      publishedAt: schema.publishedAt ?? undefined,
      updatedAt: schema.updatedAt ?? undefined,
    });
  }
}

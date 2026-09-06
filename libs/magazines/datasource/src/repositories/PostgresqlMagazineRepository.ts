import { MagazineRepository } from '@darun/magazines-domain';
import { Magazine, MagazineRepositoryToken, magazineNotFound, magazineUpdateFailed } from '@darun/magazines-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { magazines } from '../entities/MagazineSchema';

@Service(MagazineRepositoryToken)
export class PostgresqlMagazineRepository implements MagazineRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  async updateById(id: string, modifier: (magazine: Magazine) => Magazine): Promise<Magazine> {
    return this.db.transaction(async tx => {
      const prev = await tx
        .select()
        .from(magazines)
        .where(eq(magazines.id, id))
        .limit(1)
        .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

      if (!prev) {
        throw magazineNotFound();
      }

      const updated = await tx
        .update(magazines)
        .set({ ...modifier(prev), updatedAt: new Date() })
        .where(eq(magazines.id, id))
        .returning();
      if (!updated[0]) {
        throw magazineUpdateFailed();
      }

      return this.mapper(updated[0]);
    });
  }

  async findOneById(id: string): Promise<Magazine | null> {
    return this.db
      .select()
      .from(magazines)
      .where(and(eq(magazines.id, id)))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findOneBySlug(slug: string): Promise<Magazine | null> {
    return this.db
      .select()
      .from(magazines)
      .where(eq(magazines.slug, slug))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findPublishedOneBySlug(slug: string): Promise<Magazine | null> {
    return this.db
      .select()
      .from(magazines)
      .where(and(eq(magazines.slug, slug), isNotNull(magazines.publishedAt)))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findPublishedOneById(id: string): Promise<Magazine | null> {
    return this.db
      .select()
      .from(magazines)
      .where(and(eq(magazines.id, id), isNotNull(magazines.publishedAt)))
      .limit(1)
      .then(rows => (rows[0] ? this.mapper(rows[0]) : null));
  }

  async findAllWithPagination(page: number = 1, limit: number = 50): Promise<{ data: Magazine[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.select().from(magazines).limit(limit).offset(offset),
      this.db
        .select({ count: count() })
        .from(magazines)
        .then(res => Number(res[0]?.count ?? 0)),
    ]);

    return {
      data: data.map(item => this.mapper(item)),
      total,
    };
  }

  async findAllPublished(): Promise<Magazine[]> {
    return this.db
      .select()
      .from(magazines)
      .where(isNotNull(magazines.publishedAt))
      .orderBy(desc(magazines.publishedAt))
      .then(rows => rows.map(item => this.mapper(item)));
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
      logoImageUrl: schema.logoImageUrl ?? undefined,
      summary: schema.summary ?? undefined,
      content: schema.content ?? undefined,
      publishedAt: schema.publishedAt ?? undefined,
      updatedAt: schema.updatedAt ?? undefined,
    });
  }
}

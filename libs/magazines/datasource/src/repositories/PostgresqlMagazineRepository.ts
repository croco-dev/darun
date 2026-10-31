import { MagazineRepository } from '@darun/magazines-domain';
import {
  Magazine,
  MagazineRepositoryToken,
  magazineNotFound,
  magazineUpdateFailed,
  magazineRevisionConflict,
  magazineInvalidArgs,
} from '@darun/magazines-domain';
import { Drizzle } from '@darun/provider-database';
import { DrizzleToken } from '@darun/provider-database';
import { and, count, desc, eq, isNotNull } from 'drizzle-orm';
import { Inject, Service } from 'typedi';
import { magazines } from '../entities/MagazineSchema';

@Service(MagazineRepositoryToken)
export class PostgresqlMagazineRepository implements MagazineRepository {
  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {}

  publishById(id: string, expectedRevision: number): Promise<Magazine> {
    return this.db.transaction(async tx => {
      const [row] = await tx.select().from(magazines).where(eq(magazines.id, id)).for('update');
      if (!row) throw magazineNotFound();
      this.checkRevision(row.revision, expectedRevision);
      if (row.publishedAt) return this.mapper(row);

      const magazine = this.mapper(row);
      magazine.publish();
      const [updated] = await tx
        .update(magazines)
        .set({ publishedAt: magazine.publishedAt, updatedAt: new Date() })
        .where(eq(magazines.id, id))
        .returning();
      if (!updated) throw magazineUpdateFailed();
      return this.mapper(updated);
    });
  }

  async updateById(
    id: string,
    modifier: (magazine: Magazine) => Magazine,
    expectedRevision: number
  ): Promise<Magazine> {
    return this.db.transaction(async tx => {
      const prev = await tx
        .select()
        .from(magazines)
        .where(eq(magazines.id, id))
        .for('update')
        .limit(1)
        .then(rows => (rows[0] ? this.mapper(rows[0]) : null));

      if (!prev) {
        throw magazineNotFound();
      }

      this.checkRevision(prev.revision, expectedRevision);
      const updated = await tx
        .update(magazines)
        .set({
          ...modifier(prev),
          revision: prev.revision + 1,
          updatedAt: new Date(),
        })
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

  private checkRevision(actual: number, expected: number) {
    if (!Number.isInteger(expected) || expected < 0 || expected > 2_147_483_647) {
      throw magazineInvalidArgs('편집 기준 버전이 필요합니다.');
    }
    if (actual !== expected) throw magazineRevisionConflict();
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

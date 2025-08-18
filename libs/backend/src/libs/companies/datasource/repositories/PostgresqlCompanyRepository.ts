import { Company, CompanyRepository, CompanyRepositoryToken } from '@companies/domain';
import { Drizzle, DrizzleToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { count, ilike, inArray } from 'drizzle-orm';
import { keyBy } from 'es-toolkit';
import { Inject, Service } from 'typedi';
import { companies } from '../entities/CompanySchema';

@Service(CompanyRepositoryToken)
export class PostgresqlCompanyRepository implements CompanyRepository {
  private companyIdLoader: DataLoader<string, Company>;

  constructor(@Inject(DrizzleToken) private readonly db: Drizzle) {
    this.companyIdLoader = new DataLoader(
      async (companyIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(companies)
          .where(inArray(companies.id, [...companyIds]));

        const groupByDocs = keyBy(docs, doc => doc.id);
        return companyIds.map(companyId => this.mapper(groupByDocs[companyId]) || []);
      },
      {
        cache: false,
      }
    );
  }

  async insert(values: Company): Promise<Company | null> {
    return this.db.transaction(async tx => {
      const inserted = await tx.insert(companies).values(values).returning();

      return this.mapper(inserted[0]);
    });
  }

  async findById(id: string): Promise<Company | null> {
    return this.companyIdLoader.load(id);
  }

  async findByName(name: string): Promise<Company[]> {
    return this.db
      .select()
      .from(companies)
      .where(ilike(companies.name, `%${name}%`))
      .then(res => res.map(this.mapper));
  }

  async findAllWithPagination(page: number = 1, limit: number = 50): Promise<{ data: Company[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db
        .select()
        .from(companies)
        .limit(limit)
        .offset(offset)
        .then(res => res.map(this.mapper)),
      this.db
        .select({ count: count() })
        .from(companies)
        .then(res => res[0].count),
    ]);

    return {
      data,
      total,
    };
  }

  private mapper<CompanyType extends typeof companies.$inferSelect | typeof companies.$inferInsert>(
    schema: CompanyType
  ): Company {
    return new Company({
      ...schema,
      startAt: schema.startAt ?? undefined,
    });
  }
}

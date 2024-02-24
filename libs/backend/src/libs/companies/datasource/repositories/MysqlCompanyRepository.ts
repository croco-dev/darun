import { Company, CompanyRepository, CompanyRepositoryToken } from '@companies/domain';
import { Database, DatabaseToken } from '@darun/provider-database';
import DataLoader from 'dataloader';
import { inArray } from 'drizzle-orm';
import { keyBy } from 'lodash';
import { Inject, Service } from 'typedi';
import { companies } from '../entities/CompanySchema';

@Service(CompanyRepositoryToken)
export class MysqlCompanyRepository implements CompanyRepository {
  private companyIdLoader: DataLoader<string, Company>;

  constructor(@Inject(DatabaseToken) private readonly db: Database) {
    this.companyIdLoader = new DataLoader(
      async (companyIds: readonly string[]) => {
        const docs = await this.db
          .select()
          .from(companies)
          .where(inArray(companies.id, [...companyIds]));

        const groupByDocs = keyBy(docs, 'id');
        return companyIds.map(companyId => groupByDocs[companyId] || []);
      },
      {
        cache: false,
      }
    );
  }

  async findById(id: string): Promise<Company | null> {
    return this.companyIdLoader.load(id);
  }
}

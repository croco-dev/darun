import { GetAllCompanies } from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Int, Query, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Company } from './graphs/Company';
import { CompanyPagination } from './graphs/CompanyPagination';

@Resolver(() => Company)
@Service()
export class CompanyQueryResolver {
  constructor(private readonly getAllCompanies: GetAllCompanies) {}

  @Authorized([AuthRole.Admin])
  @Query(() => CompanyPagination)
  public async allCompanies(@Arg('page', () => Int) page: number): Promise<CompanyPagination> {
    const limit = 50;
    const { data, total } = await this.getAllCompanies.execute({ page, limit });

    return {
      totalCount: total,
      totalPages: Math.ceil(total / limit),
      companies: data,
    };
  }
}

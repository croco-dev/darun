import { CreateCompany } from '@darun/backend';
import { AuthRole } from '@darun/utils-apollo-server';
import { Arg, Authorized, Mutation, Resolver } from 'type-graphql';
import { Service } from 'typedi';
import { Company } from './graphs/Company';
import { CreateCompanyInput, CreateCompanyPayload } from './graphs/CreateCompany';

@Resolver(() => Company)
@Service()
export class CompanyMutationResolver {
  constructor(private readonly createCompanyUseCase: CreateCompany) {}

  @Authorized([AuthRole.Admin])
  @Mutation(() => CreateCompanyPayload)
  async createCompany(@Arg('input') input: CreateCompanyInput): Promise<CreateCompanyPayload> {
    const company = await this.createCompanyUseCase.execute({
      name: input.name,
      address: input.address,
      type: input.type,
      size: input.size,
      region: input.region,
      startAt: new Date(input.startAt),
    });

    return {
      company,
    };
  }
}

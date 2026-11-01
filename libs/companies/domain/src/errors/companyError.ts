export enum CompanyError {
  CreateFailed = 'company/create-failed',
  InvalidListArgs = 'company/invalid-list-args',
  InvalidSearchArgs = 'company/invalid-search-args',
}

export const companyCreateFailed = () => new Error(CompanyError.CreateFailed);

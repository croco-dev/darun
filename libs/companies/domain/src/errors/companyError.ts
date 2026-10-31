export enum CompanyError {
  CreateFailed = 'company/create-failed',
  InvalidSearchArgs = 'company/invalid-search-args',
}

export const companyCreateFailed = () => new Error(CompanyError.CreateFailed);

export enum CompanyError {
  CreateFailed = 'company/create-failed',
}

export const companyCreateFailed = () => new Error(CompanyError.CreateFailed);

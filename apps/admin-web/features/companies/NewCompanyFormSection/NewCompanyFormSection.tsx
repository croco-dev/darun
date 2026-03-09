'use client';

import { NewCompanyForm } from '@darun/companies-feature';

export const NewCompanyFormSection = () => {
  return (
    <div className="border shadow-sm rounded-md bg-white">
      <div className="border-b px-4 py-2">
        <div className="font-medium">기업 등록</div>
      </div>
      <div className="p-4 mt-2 pb-4">
        <div className="flex flex-col gap-3">
          <NewCompanyForm />
        </div>
      </div>
    </div>
  );
};

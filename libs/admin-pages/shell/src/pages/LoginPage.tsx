import { LoginSection } from '@darun/admin-accounts-shell';

import { Logo } from '../uis';

export const LoginPage = () => {
  return (
    <div className="w-full min-h-screen bg-gray-100">
      <div className="max-w-[400px] mx-auto mt-14 mb-14 w-[340px]">
        <div className="flex items-center gap-1.5 justify-center">
          <Logo size={24} />{' '}
          <h2 className="text-base font-extrabold text-gray-700">
            다른 관리자
          </h2>
        </div>
        <h2 className="text-2xl font-medium text-gray-800 text-center mt-2">
          로그인
        </h2>

        <div className="border border-gray-200 shadow-md p-8 mt-8 rounded-md">
          <LoginSection />
        </div>
      </div>
    </div>
  );
};

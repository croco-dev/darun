import { Logo, AdminPanel } from '@darun/ui-admin';
import { LoginSection } from '../../../features/auth/LoginSection';

export default function LoginPage() {
  return (
    <div className="w-full min-h-screen bg-dark-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[400px] w-[340px] space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Logo size={40} />
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight text-dark-900">다른 관리자</h2>
            <p className="mt-1 text-sm text-dark-500">관리자 계정으로 로그인해 주세요.</p>
          </div>
        </div>

        <AdminPanel className="p-8">
          <LoginSection />
        </AdminPanel>
      </div>
    </div>
  );
}

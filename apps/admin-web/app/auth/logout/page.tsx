import { AdminPanel, AdminSection, AdminSectionHeader, AdminSectionBody, AdminActions } from '@darun/ui-admin';
import { Link } from '@darun/utils-router';
import { LogoutSection } from '../../../features/auth/LogoutSection';

export default function LogoutPage() {
  return (
    <div className="w-full min-h-screen bg-surface-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[400px] w-[340px] space-y-6">
        <AdminPanel>
          <AdminSection>
            <AdminSectionHeader title="로그아웃" />
            <AdminSectionBody>
              <p className="text-sm text-dark-600">정말로 로그아웃 하시겠습니까?</p>
              <AdminActions>
                <Link href="/">
                  <button
                    type="button"
                    className="rounded-lg border border-dark-200 bg-white px-4 py-2 text-sm font-medium text-dark-700 hover:bg-surface-100 transition motion-reduce:transition-none outline-none focus-visible:ring-2 focus-visible:ring-dark-900/40"
                  >
                    취소
                  </button>
                </Link>
                <LogoutSection />
              </AdminActions>
            </AdminSectionBody>
          </AdminSection>
        </AdminPanel>
      </div>
    </div>
  );
}

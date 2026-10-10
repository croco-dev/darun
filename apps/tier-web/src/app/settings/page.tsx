import { Card } from '@/components/ui/card';
import { createClient } from '@/utils/supabase/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PasswordChangeForm } from './components/PasswordChangeForm';
import { SettingsSidebar } from './components/SettingsSidebar';

export const metadata: Metadata = {
  title: '설정',
  description: '계정 설정 및 비밀번호 변경',
};

const sidebarNavItems = [
  {
    title: '계정',
    href: '/settings',
  },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="page-shell py-8 md:py-10">
      <section className="space-y-2 border-b border-border pb-6 md:pb-8">
        <p className="section-label">설정</p>
        <h1 className="editorial-display text-[1.9rem] text-foreground md:text-[2.2rem]">계정 설정</h1>
        <p className="text-sm leading-6 text-muted-foreground">로그인 계정과 비밀번호를 관리합니다.</p>
      </section>

      <div className="grid gap-4 pt-6 md:pt-8 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-3">
          <SettingsSidebar items={sidebarNavItems} />
          <Card variant="default" className="gap-2 p-4">
            <p className="text-xs text-muted-foreground">로그인 계정</p>
            <p className="break-all text-sm text-foreground">{user.email}</p>
          </Card>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">비밀번호 변경</h2>
            <p className="text-sm text-muted-foreground">현재 계정의 비밀번호를 새 값으로 바꿉니다.</p>
          </div>
          <PasswordChangeForm />
        </div>
      </div>
    </div>
  );
}

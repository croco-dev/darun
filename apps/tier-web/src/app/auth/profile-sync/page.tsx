'use client';

import { retryUserProfile } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useActionState } from 'react';

export default function ProfileSyncPage() {
  const [state, action, pending] = useActionState(retryUserProfile, { error: '' });
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-bold">앱 사용자 정보를 연결하지 못했습니다</h1>
      <p className="max-w-md text-sm leading-6">
        인증 요청은 처리되었지만 앱 사용자 정보 저장을 마치지 못했습니다. 계정을 새로 만들 필요는 없습니다. 가입
        직후라면 받은 이메일의 인증 링크를 열고 같은 계정으로 로그인해 주세요. 이미 로그인했다면 아래에서 정보 연결만
        다시 시도할 수 있습니다.
      </p>
      <form action={action}>
        <Button type="submit" disabled={pending}>
          {pending ? '연결 중...' : '사용자 정보 연결 다시 시도'}
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="max-w-md text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Link href="/auth/signin" className="underline">
        같은 계정으로 로그인
      </Link>
    </div>
  );
}

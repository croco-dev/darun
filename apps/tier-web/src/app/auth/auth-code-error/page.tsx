import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AuthCodeError() {
  return (
    <div className="page-shell flex min-h-[60vh] flex-col items-center justify-center gap-4 py-8 text-center">
      <h1 className="text-2xl font-bold">이메일 인증을 완료하지 못했습니다</h1>
      <p className="max-w-md text-sm leading-6">
        인증 링크가 만료되었거나 이미 사용되었을 수 있습니다. 이미 인증을 마쳤다면 로그인해 주세요. 인증 이메일을
        받았다면 가장 최근 링크를 확인해 주세요.
      </p>
      <Button asChild>
        <Link href="/auth/signin">로그인으로 돌아가기</Link>
      </Button>
      <Link href="/auth/signup" className="underline">
        회원가입으로 이동
      </Link>
    </div>
  );
}

'use client';

import { login } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useActionState } from 'react';

const initialState = {
  error: '',
};

export default function SignInPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <div className="page-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-8 md:py-10">
      <div className="w-full max-w-[440px] space-y-4">
        <div className="space-y-2 text-center">
          <p className="section-label">로그인</p>
          <h1 className="editorial-display text-[1.9rem] text-foreground">다른티어 로그인</h1>
          <p className="text-sm leading-6 text-muted-foreground">저장된 계정으로 다시 들어오세요.</p>
        </div>

        <Card variant="default" className="p-5 md:p-6">
          <CardHeader className="px-0">
            <CardTitle className="text-lg">이메일로 로그인</CardTitle>
            <CardDescription>기존 인증 흐름을 그대로 사용합니다.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {state?.error && (
                <div className="rounded-[0.75rem] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {state.error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? '로그인 중...' : '로그인'}
              </Button>
            </form>

            <p className="mt-5 text-sm text-muted-foreground">
              계정이 없으신가요?{' '}
              <Link href="/auth/signup" className="font-medium text-foreground hover:text-primary">
                회원가입
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

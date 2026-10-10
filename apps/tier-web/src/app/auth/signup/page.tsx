'use client';

import { signup } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useActionState } from 'react';

const initialState = {
  error: '',
  message: '',
};

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(signup, initialState);

  return (
    <div className="page-shell flex min-h-[calc(100vh-8rem)] items-center justify-center py-8 md:py-10">
      <div className="w-full max-w-[440px] space-y-4">
        <div className="space-y-2 text-center">
          <p className="section-label">회원가입</p>
          <h1 className="editorial-display text-[1.9rem] text-foreground">다른티어 시작하기</h1>
          <p className="text-sm leading-6 text-muted-foreground">이메일과 비밀번호로 간단히 계정을 만듭니다.</p>
        </div>

        <Card variant="default" className="p-5 md:p-6">
          <CardHeader className="px-0">
            <CardTitle className="text-lg">이메일로 회원가입</CardTitle>
            <CardDescription>가입 후 설정과 관리자 접근 흐름은 그대로 유지됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              {state?.error && (
                <div className="rounded-[0.75rem] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {state.error}
                </div>
              )}
              {state?.message && (
                <div className="rounded-[0.75rem] border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {state.message}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? '가입 중...' : '회원가입'}
              </Button>
            </form>

            <p className="mt-5 text-sm text-muted-foreground">
              이미 계정이 있으신가요?{' '}
              <Link href="/auth/signin" className="font-medium text-foreground hover:text-primary">
                로그인
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

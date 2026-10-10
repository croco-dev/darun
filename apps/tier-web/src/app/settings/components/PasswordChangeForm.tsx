'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updatePassword } from '../actions';

const initialState = {
  message: '',
  error: '',
  success: false,
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? '변경 중...' : '비밀번호 변경'}
    </Button>
  );
}

export function PasswordChangeForm() {
  const [state, formAction] = useActionState(updatePassword, initialState);

  return (
    <Card variant="default" className="gap-4 p-5 md:p-6">
      <CardHeader>
        <CardTitle>비밀번호 변경</CardTitle>
        <CardDescription>계정의 비밀번호를 변경합니다. 새로운 비밀번호를 입력해 주세요.</CardDescription>
      </CardHeader>
      <form action={formAction} className="space-y-6">
        <CardContent className="space-y-4">
          {state?.success && (
            <Alert className="border-green-300 bg-green-50 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>성공</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">새 비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="6자 이상 입력"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              placeholder="비밀번호를 다시 입력하세요"
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}

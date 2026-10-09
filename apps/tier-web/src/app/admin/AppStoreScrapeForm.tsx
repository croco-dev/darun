'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect, useRef } from 'react';
import { type AppStoreSearchState, searchAndAddApps } from './actions';

const initialState: AppStoreSearchState = { status: 'idle', message: '' };

export function AppStoreScrapeForm() {
  const [state, formAction, isPending] = useActionState(searchAndAddApps, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return (
    <Card variant="default" className="gap-3 p-4">
      <div className="space-y-1">
        <h2 className="font-medium text-foreground">App Store 앱 추가</h2>
        <p className="text-xs text-muted-foreground">검색 결과는 최대 25개이며, 이미 등록된 앱은 건너뜁니다.</p>
      </div>
      <form ref={formRef} action={formAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="app-store-keyword">검색어</Label>
          <Input
            id="app-store-keyword"
            name="keyword"
            maxLength={100}
            required
            disabled={isPending}
            placeholder="App Store 앱 이름"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? '검색 중...' : '검색 후 추가'}
        </Button>
      </form>
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.status === 'success' && (
        <output aria-live="polite" className="text-sm text-foreground">
          {state.message}
        </output>
      )}
    </Card>
  );
}

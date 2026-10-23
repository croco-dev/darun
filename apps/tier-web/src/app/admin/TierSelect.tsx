'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { updateTier } from './actions';

interface TierSelectProps {
  appId: string;
  initialTier: number;
}

export function TierSelect({ appId, initialTier }: TierSelectProps) {
  const [tier, setTier] = useState(String(initialTier));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="space-y-2">
      <Select
        value={tier}
        disabled={pending}
        onValueChange={async value => {
          setPending(true);
          setError('');
          try {
            await updateTier(appId, Number(value));
            setTier(value);
          } catch {
            setError('티어를 저장하지 못했습니다. 이전 티어를 유지합니다. 다시 시도해 주세요.');
          } finally {
            setPending(false);
          }
        }}
      >
        <SelectTrigger aria-label="앱 티어" className="w-[180px]">
          <SelectValue placeholder="티어 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">티어 없음</SelectItem>
          <SelectItem value="1">1티어</SelectItem>
          <SelectItem value="2">2티어</SelectItem>
          <SelectItem value="3">3티어</SelectItem>
        </SelectContent>
      </Select>
      {error && (
        <p role="alert" className="max-w-xs text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

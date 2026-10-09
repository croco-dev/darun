'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateTier } from './actions';

interface TierSelectProps {
  appId: string;
  initialTier: number;
}

export function TierSelect({ appId, initialTier }: TierSelectProps) {
  return (
    <Select defaultValue={initialTier.toString()} onValueChange={value => updateTier(appId, parseInt(value))}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Tier" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="0">No Tier</SelectItem>
        <SelectItem value="1">Tier 1</SelectItem>
        <SelectItem value="2">Tier 2</SelectItem>
        <SelectItem value="3">Tier 3</SelectItem>
      </SelectContent>
    </Select>
  );
}

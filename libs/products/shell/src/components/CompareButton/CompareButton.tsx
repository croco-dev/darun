'use client';

import { Button } from '@darun/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const STORAGE_KEY = 'compare-products';
const MAX_COMPARE_ITEMS = 2;

type CompareButtonProps = {
  slug: string;
};

export const CompareButton = ({ slug }: CompareButtonProps) => {
  const router = useRouter();

  const getStoredList = (): string[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  };

  const [compareList, setCompareList] = useState<string[]>(getStoredList);
  const isAdded = compareList.includes(slug);


  const handleClick = () => {
    let newList = [...compareList];

    if (isAdded) {
      newList = newList.filter(item => item !== slug);
    } else {
      if (newList.length >= MAX_COMPARE_ITEMS) {
        newList.shift();
      }
      newList.push(slug);
    }

    setCompareList(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));

    if (newList.length === 2) {
      router.push(`/compare/${newList[0]}/${newList[1]}`);
    }
  };

  return (
    <Button
      variant={isAdded ? 'contained' : 'shadow'}
      color="secondary"
      size="md"
      onClick={handleClick}
      data-testid="compare-button"
    >
      <div className="flex items-center gap-1.5">
        <Plus size={16} />
        <span>{isAdded ? '비교 취소' : '비교에 추가'}</span>
      </div>
    </Button>
  );
};

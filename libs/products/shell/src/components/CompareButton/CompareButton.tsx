'use client';

import { AnalyticsEvents, track, type ProductAttributionSource } from '@darun/analytics-client';
import { Button, Check, Plus } from '@darun/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const STORAGE_KEY = 'compare-products';
const MAX_COMPARE_ITEMS = 2;

type CompareButtonProps = {
  slug: string;
  source?: ProductAttributionSource;
};

export const CompareButton = ({ slug, source }: CompareButtonProps) => {
  const router = useRouter();

  const getStoredList = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
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

    const effectiveSource = source ?? 'direct';

    if (isAdded) {
      track(AnalyticsEvents.COMPARE_CTA_CLICKED, {
        productSlug: slug,
        action: 'remove',
        source: effectiveSource,
        compareCount: newList.length,
      });
    } else if (newList.length === 2) {
      const targetSlug = newList.find(s => s !== slug)!;
      track(AnalyticsEvents.COMPARE_CTA_CLICKED, {
        productSlug: slug,
        action: 'navigate',
        source: effectiveSource,
        compareCount: 2,
        targetSlug,
      });
    } else {
      track(AnalyticsEvents.COMPARE_CTA_CLICKED, {
        productSlug: slug,
        action: 'add',
        source: effectiveSource,
        compareCount: newList.length,
      });
    }

    if (newList.length === 2) {
      router.push(`/compare/${newList[0]}/${newList[1]}`);
    }
  };

  return (
    <Button
      variant="shadow"
      color={isAdded ? 'primary' : 'secondary'}
      size="md"
      onClick={handleClick}
      data-testid="compare-button"
      className="group transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-center gap-1.5">
        {isAdded ? (
          <Check size={16} className="text-current stroke-[2.25] transition-transform duration-200 group-hover:scale-110" />
        ) : (
          <Plus size={16} className="text-dark-600 stroke-[2] transition-transform duration-200 group-hover:scale-110 group-hover:text-dark-900" />
        )}
        <span className="break-keep font-semibold">{isAdded ? '비교 취소' : '비교에 추가'}</span>
      </div>
    </Button>
  );
};

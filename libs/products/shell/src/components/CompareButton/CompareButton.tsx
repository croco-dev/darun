'use client';

import { AnalyticsEvents, track, type ProductAttributionSource } from '@darun/analytics-client';
import { Button, Check, Plus } from '@darun/ui';
import { useRouter } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'compare-products';
const MAX_COMPARE_ITEMS = 2;
const EMPTY_LIST: string[] = [];

let cachedRaw: string | null = null;
let cachedList: string[] = EMPTY_LIST;

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('compare-updated', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('compare-updated', callback);
  };
}

function getSnapshot(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedList = raw ? JSON.parse(raw) : EMPTY_LIST;
    }
    return cachedList;
  } catch {
    return EMPTY_LIST;
  }
}

function getServerSnapshot(): string[] {
  return EMPTY_LIST;
}

type CompareButtonProps = {
  slug: string;
  source?: ProductAttributionSource;
};

export const CompareButton = ({ slug, source }: CompareButtonProps) => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('ProductDetail.compareButton');
  const compareList = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    window.dispatchEvent(new Event('compare-updated'));

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
      router.push(`/${locale}/compare/${newList[0]}/${newList[1]}`);
    }
  };

  const buttonLabel = isAdded ? t('remove') : t('add');

  return (
    <Button
      variant="shadow"
      color={isAdded ? 'primary' : 'secondary'}
      size="md"
      onClick={handleClick}
      data-testid="compare-button"
      aria-label={buttonLabel}
      aria-pressed={isAdded}
      title={buttonLabel}
      className={`group h-10 sm:h-11 px-3.5 sm:px-4 transition-all duration-150 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${
        isAdded
          ? 'border-dark-900 bg-dark-900 text-white shadow-button hover:border-dark-800 hover:bg-dark-800'
          : 'border-dark-150 bg-white text-dark-800 shadow-button hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {isAdded ? (
          <Check size={16} className="text-current stroke-[2.25] shrink-0" aria-hidden="true" />
        ) : (
          <Plus
            size={16}
            className="text-dark-600 stroke-[2.25] shrink-0 transition-colors duration-200 group-hover:text-dark-900"
            aria-hidden="true"
          />
        )}
        <span className="select-none whitespace-nowrap text-sm font-semibold">{buttonLabel}</span>
      </div>
    </Button>
  );
};

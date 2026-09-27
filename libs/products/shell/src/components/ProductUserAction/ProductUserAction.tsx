'use client';

import { AlertCircle, Button, Check, Copy, Heart, useToast } from '@darun/ui';
import { bind } from '@darun/utils-structure-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { CompareButton } from '../CompareButton';
import { useProductUserAction } from './useProductUserAction';

export const ProductUserAction = bind(
  useProductUserAction,
  ({ voteCount, upvoteProduct, voted, loading, error, slug }) => {
    const { addToast } = useToast();
    const locale = useLocale();
    const t = useTranslations('ProductDetail.action');
    const [copied, setCopied] = useState(false);
    const hasShownSuccessToastRef = useRef(false);
    const prevErrorRef = useRef<string | null>(null);

    const voteLabel = voted ? t('cancelUpvote') : t('upvote');

    useEffect(() => {
      if (error && error !== prevErrorRef.current) {
        addToast(error, 'error');
        hasShownSuccessToastRef.current = false;
      } else if (voted && !loading && !hasShownSuccessToastRef.current) {
        addToast(t('voteSuccess'), 'success');
        hasShownSuccessToastRef.current = true;
      } else if (!voted) {
        hasShownSuccessToastRef.current = false;
      }
      prevErrorRef.current = error;
    }, [error, voted, loading, addToast, t]);

    const handleCopyLink = async () => {
      if (typeof window === 'undefined') return;
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        addToast(t('copySuccess'), 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard unavailable
      }
    };

    const copyLabel = copied ? t('copied') : t('copyLink');

    return (
      <div className="flex items-center gap-2">
        <Button
          variant="shadow"
          color="secondary"
          size="md"
          onClick={upvoteProduct}
          disabled={loading}
          data-testid="upvote-btn"
          aria-label={voteLabel}
          aria-pressed={voted}
          title={voteLabel}
          className={`group h-10 sm:h-11 px-3.5 sm:px-4 transition-all duration-150 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${
            voted
              ? 'border-dark-900 bg-dark-900 text-white shadow-button hover:bg-dark-800 hover:border-dark-800'
              : 'border-dark-150 bg-white text-dark-800 shadow-button hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            {loading ? (
              <div
                data-testid="upvote-loading"
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-b-transparent motion-reduce:animate-none"
              />
            ) : error ? (
              <span
                data-testid="upvote-error"
                className="inline-flex items-center justify-center text-cherry-600"
                title={error}
              >
                <AlertCircle size={16} className="stroke-[2.25]" aria-hidden="true" />
              </span>
            ) : (
              <Heart
                size={16}
                aria-hidden="true"
                className={`transition-colors duration-150 ${
                  voted ? 'fill-white text-white' : 'fill-transparent text-dark-500 group-hover:text-dark-900'
                }`}
              />
            )}
            <span
              className={`break-keep text-sm font-semibold tabular-nums transition-colors duration-150 ${voted ? 'text-white' : 'text-dark-700 group-hover:text-dark-900'}`}
            >
              {voteCount.toLocaleString(locale)}
            </span>
          </div>
        </Button>
        <CompareButton slug={slug} source="direct" />
        <Button
          variant="shadow"
          color="secondary"
          size="md"
          onClick={handleCopyLink}
          data-testid="share-btn"
          aria-label={copyLabel}
          title={copyLabel}
          className="group flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center p-0 transition-all duration-150 active:scale-[0.98] border-dark-150 bg-white text-dark-800 shadow-button hover:border-dark-300 hover:bg-surface-100 hover:text-dark-950 hover:shadow-button-hover motion-reduce:transform-none motion-reduce:transition-none"
        >
          <div className="flex items-center justify-center">
            {copied ? (
              <Check size={16} className="text-leaf-600 stroke-[2.25]" aria-hidden="true" />
            ) : (
              <Copy
                size={16}
                aria-hidden="true"
                className="text-dark-500 stroke-[2] transition-colors duration-150 group-hover:text-dark-900"
              />
            )}
          </div>
        </Button>
      </div>
    );
  }
);

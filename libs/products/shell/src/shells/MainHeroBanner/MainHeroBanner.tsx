'use client';

import { Button, ContentArea } from '@darun/ui';
import { useNavigate } from '@darun/utils-router';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';

import { ProductsCount } from '../../components/ProductsCount';

const buildSearchPath = (locale: string) => `/${locale}/search/product`;

export const MainHeroBanner = () => {
  const locale = useLocale();
  const navigate = useNavigate();
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const searchPath = useMemo(() => buildSearchPath(locale), [locale]);
  const popularPath = `/${locale}/ranking`;

  const navigateToSearch = () => {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      navigate(searchPath);
      return;
    }

    navigate(`${searchPath}?query=${encodeURIComponent(normalizedQuery)}`);
  };

  return (
    <section className="home-motion relative left-1/2 mb-6 w-screen -translate-x-1/2 overflow-hidden md:mb-8">
      <div
        className="group relative isolate overflow-hidden border-y border-brand-200/70 bg-brand-700 text-dark-900 shadow-[var(--home-shadow-card)]"
        style={{ backgroundImage: 'var(--home-gradient-hero)' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,theme(colors.brand.100/.95),transparent_42%),radial-gradient(circle_at_78%_22%,theme(colors.brand.400/.24),transparent_30%),linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.24)_45%,transparent_100%)] transition-transform duration-300 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none" />
        <div className="absolute inset-y-0 right-[-18%] hidden w-[44%] rounded-full bg-brand-600/12 blur-3xl transition-transform duration-300 ease-out group-hover:-translate-x-2 md:block motion-reduce:transform-none motion-reduce:transition-none" />
        <div className="absolute left-[-8%] top-[14%] h-40 w-40 rounded-full bg-white/55 blur-3xl transition-transform duration-300 ease-out group-hover:translate-y-1 md:h-56 md:w-56 motion-reduce:transform-none motion-reduce:transition-none" />
        <ContentArea className="relative z-10">
          <div className="grid items-center gap-8 py-12 sm:py-14 md:min-h-[560px] md:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)] md:gap-10 md:py-16">
            <div className="flex flex-col items-start gap-6 text-left md:gap-7">
              <div className="inline-flex min-h-11 items-center rounded-full border border-white/70 bg-white/72 px-3.5 py-2 text-xs font-medium tracking-tight text-brand-700 shadow-[0_12px_32px_-20px_rgba(53,63,174,0.45)] backdrop-blur transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none sm:px-4 sm:text-sm">
                {t('Main.hero.description')}
              </div>
              <div className="flex max-w-3xl flex-col gap-4">
                <h1 className="darun-heading text-[1.85rem] font-semibold leading-[1.05] tracking-[-0.06em] text-dark-900 sm:text-[2.35rem] md:text-[3.5rem]">
                  <span className="flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-[2.6rem] leading-none text-brand-700 sm:text-[3.8rem] md:text-[5rem] [&_span]:text-brand-700">
                      <ProductsCount />
                    </span>
                    <span className="text-base font-medium tracking-[-0.04em] text-dark-700 sm:text-[1.2rem] md:pb-2 md:text-[1.6rem]">
                      {t('Main.hero.title.countSuffix')}
                    </span>
                  </span>
                  <span className="mt-2 block text-dark-900">
                    <span className="text-brand-700">{t('Main.hero.title.highlight')}</span>{' '}
                    {t('Main.hero.title.ending')}
                  </span>
                </h1>
              </div>
              <form
                className="flex w-full flex-col gap-2.5 rounded-[24px] border border-white/75 bg-white/86 p-2.5 shadow-[var(--home-shadow-card)] backdrop-blur transition-all duration-200 ease-out focus-within:border-brand-300 focus-within:shadow-[0_28px_60px_-30px_rgba(53,63,174,0.42)] motion-reduce:transition-none md:max-w-2xl md:flex-row md:items-center md:gap-3 md:p-3"
                onSubmit={event => {
                  event.preventDefault();
                  navigateToSearch();
                }}
              >
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] border border-brand-200 bg-white px-4 py-3.5 shadow-[0_10px_26px_-18px_rgba(53,63,174,0.28)] transition-all duration-200 ease-out focus-within:border-brand-400 focus-within:shadow-[0_0_0_4px_rgba(96,109,255,0.12),0_18px_30px_-24px_rgba(53,63,174,0.36)] motion-reduce:transition-none md:py-4">
                  <Search
                    size={18}
                    className="shrink-0 text-brand-700 transition-transform duration-200 ease-out motion-reduce:transform-none motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                  <input
                    aria-label={t('home.hero.searchPlaceholder')}
                    type="text"
                    placeholder={t('home.hero.searchPlaceholder')}
                    className="w-full border-none bg-transparent text-base font-medium tracking-[-0.02em] text-dark-900 outline-none placeholder:text-dark-500"
                    value={query}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                  />
                </label>
                <Button
                  type="submit"
                  variant="contained"
                  size="lg"
                  className="h-14 w-full border-brand-700 bg-brand-700 px-6 text-base font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_18px_34px_-20px_rgba(53,63,174,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:h-[58px] md:w-auto"
                  aria-label={t('home.hero.searchPlaceholder')}
                >
                  <Search size={18} aria-hidden="true" />
                </Button>
              </form>
              <div className="flex w-full flex-col gap-2.5 md:flex-row md:flex-wrap md:gap-3">
                <Button
                  as={Link}
                  href={popularPath}
                  variant="contained"
                  size="lg"
                  className="min-h-11 w-full border-brand-700 bg-brand-700 px-6 py-3 text-base font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_18px_34px_-20px_rgba(53,63,174,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-50 active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:w-auto"
                >
                  {t('home.hero.cta.popular')}
                </Button>
                <Button
                  as={Link}
                  href={searchPath}
                  variant="shadow"
                  size="lg"
                  color="secondary"
                  className="min-h-11 w-full border-white/85 bg-white/86 px-6 py-3 text-base font-semibold text-brand-700 shadow-[var(--home-shadow-card)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:border-brand-200 hover:shadow-[0_20px_34px_-24px_rgba(53,63,174,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-50 active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none md:w-auto"
                >
                  {t('home.hero.cta.categories')}
                </Button>
              </div>
            </div>
            <div className="flex justify-start md:justify-end">
              <div className="relative w-full max-w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[var(--home-shadow-card)] backdrop-blur transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_36px_68px_-36px_rgba(53,63,174,0.36)] motion-reduce:transform-none motion-reduce:transition-none sm:max-w-[360px] md:rounded-[32px] md:p-8">
                <div className="absolute right-[-18%] top-[-16%] h-40 w-40 rounded-full bg-brand-600/16 blur-3xl transition-transform duration-300 ease-out group-hover:translate-x-2 group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none" />
                <div className="relative flex flex-col gap-4 md:gap-6">
                  <div className="flex flex-col gap-2 rounded-[24px] border border-brand-100 bg-white/82 px-4 py-4 shadow-[0_14px_32px_-22px_rgba(53,63,174,0.24)] transition-transform duration-300 ease-out group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none md:px-5 md:py-5">
                    <span className="text-sm font-medium tracking-[-0.02em] text-dark-600">
                      {t('Main.hero.description')}
                    </span>
                    <span className="text-xl font-semibold leading-tight tracking-[-0.05em] text-dark-900 md:text-2xl">
                      {t('home.hero.title')}
                    </span>
                    <span className="text-sm leading-6 text-dark-600">{t('home.hero.subtitle')}</span>
                  </div>
                  <div className="grid gap-2.5 rounded-[24px] bg-brand-700 px-4 py-5 text-white shadow-[0_20px_44px_-28px_rgba(53,63,174,0.62)] transition-transform duration-300 ease-out group-hover:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none md:gap-3 md:px-5 md:py-6">
                    <span className="text-lg font-semibold tracking-[-0.04em]">{t('Main.hero.title.highlight')}</span>
                    <span className="text-sm font-medium leading-6 text-white/85">{t('Main.hero.title.ending')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContentArea>
      </div>
    </section>
  );
};

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

type MagazineInfoSectionProps = { slug: string };

export const MagazineInfoSection = ({ slug: _slug }: MagazineInfoSectionProps) => {
  const t = useTranslations('Magazine');

  return (
    <div className="relative overflow-hidden rounded-3xl py-6 sm:py-11 lg:py-11">
      <Image
        className="absolute top-0 left-0 right-0 h-full w-full rounded-3xl object-cover"
        style={{ zIndex: 5 }}
        src={
          'https://images.unsplash.com/photo-1738683987578-e8a796a9de27?q=80&w=3687&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
        }
        alt="Magazine background"
        fill
      />
      <div
        className="absolute top-0 left-0 right-0 bottom-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 10 }}
      ></div>
      <div className="relative flex flex-col gap-5 px-7 sm:px-7 lg:px-11" style={{ zIndex: 15 }}>
        <div className="flex w-fit flex-row items-center rounded-full border border-white/60 px-3 py-1">
          <p className="text-xs font-normal leading-normal tracking-tight text-white/80 sm:text-sm sm:tracking-normal lg:text-sm lg:tracking-normal">
            {t('info.badge')}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xl font-semibold leading-normal tracking-tight text-white sm:text-2xl lg:text-4xl">
            {t('info.title')}
          </p>
          <p className="text-sm font-normal leading-snug tracking-tight text-white/70 sm:text-base lg:text-base">
            {t('info.summary')}
          </p>
          <p className="text-sm font-normal tracking-tight text-white/80 sm:text-base lg:text-base">{t('info.meta')}</p>
        </div>
      </div>
    </div>
  );
};

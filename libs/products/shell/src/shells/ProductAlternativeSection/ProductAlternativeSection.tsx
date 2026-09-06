'use client';

import { Button } from '@darun/ui';
import { SectionHeader } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useLocale, useTranslations } from 'next-intl';
import { AlternativeProductList } from '../../components';

type ProductAlternativeSectionProps = {
  slug: string;
};

export const ProductAlternativeSection = ({ slug }: ProductAlternativeSectionProps) => {
  const t = useTranslations('Alternative');
  const locale = useLocale();

  return (
    <section className="flex flex-col gap-5" id="darun">
      <SectionHeader title={t('section.title')} subtitle={t('section.description')} />
      <AlternativeProductList slug={slug} />
      <div className="flex justify-center pt-2">
        <Link href={`/${locale}/products/${slug}/alternatives`}>
          <Button variant="shadow" color="secondary">
            <div className="flex items-center justify-center gap-1.5">
              <svg
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 23 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.16671 17.4167H6.00004C6.00004 18.4278 6.82229 19.25 7.83337 19.25H15.1667C16.1778 19.25 17 18.4278 17 17.4167H18.8334C19.8445 17.4167 20.6667 16.5944 20.6667 15.5833V6.41667C20.6667 5.40558 19.8445 4.58333 18.8334 4.58333H17C17 3.57225 16.1778 2.75 15.1667 2.75H7.83337C6.82229 2.75 6.00004 3.57225 6.00004 4.58333H4.16671C3.15562 4.58333 2.33337 5.40558 2.33337 6.41667V15.5833C2.33337 16.5944 3.15562 17.4167 4.16671 17.4167ZM18.8334 6.41667V15.5833H17V6.41667H18.8334ZM7.83337 4.58333H15.1667L15.1676 17.4167H7.83337V4.58333ZM4.16671 6.41667H6.00004V15.5833H4.16671V6.41667Z"
                  fill="currentColor"
                />
              </svg>
              {t('section.moreButton')}
            </div>
          </Button>
        </Link>
      </div>
    </section>
  );
};

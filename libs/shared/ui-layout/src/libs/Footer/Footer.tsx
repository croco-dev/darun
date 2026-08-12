import { ContentArea } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { bind } from '@darun/utils-structure-react';
import { useFooter } from './useFooter';

export const Footer = bind(useFooter, ({ privacyUrl, termsUrl }) => (
  <footer className="mt-auto border-t border-dark-150 py-8 md:py-10">
    <ContentArea>
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-dark-900">다른</span>
            <span className="text-xs text-dark-400">/</span>
            <span className="text-sm text-dark-500">&copy; {new Date().getFullYear()} Croco</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href={privacyUrl}
              className="text-sm text-dark-600 transition-colors duration-200 hover:text-dark-900 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              개인정보처리방침
            </Link>
            <Link
              href={termsUrl}
              className="text-sm text-dark-600 transition-colors duration-200 hover:text-dark-900 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              서비스 약관
            </Link>
            <a
              href="https://forms.gle/nDPFKAYSuoGg2J3MA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-dark-600 transition-colors duration-200 hover:text-dark-900 hover:underline focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              문의
            </a>
          </nav>
          <p className="max-w-xl text-sm leading-relaxed text-dark-500">
            ‘다른’ 서비스는 단순 정보를 제공하며, 각 개별 컨텐츠의 저작권과 소유권을 보유하고 있지 않습니다. ‘다른’
            서비스는 공신력 있는 매체가 아닙니다. 사이트에 있는 내용을 맹신하지 마세요.
          </p>
        </div>
      </div>
    </ContentArea>
  </footer>
));

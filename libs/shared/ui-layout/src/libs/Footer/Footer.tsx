import { bind } from '@croco/utils-structure-react';
import { ContentArea } from '@darun/ui-foundation';
import { useFooter } from './useFooter';

export const Footer = bind(useFooter, () => (
  <footer className="py-7">
    <ContentArea>
      <div className="flex flex-col justify-between gap-6 sm:flex-row">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium text-dark-600">&copy; 2024 Croco</span>
            <span className="text-sm font-medium text-dark-400">•</span>
            <span className="text-sm font-medium text-dark-600">개인정보처리방침</span>
            <span className="text-sm font-medium text-dark-400">•</span>
            <span className="text-sm font-medium text-dark-600">서비스 약관</span>
            <span className="text-sm font-medium text-dark-400">•</span>
            <span className="text-sm font-medium text-dark-600">문의</span>
          </div>
          <div className="flex">
            <p className="text-[13px] font-normal text-dark-500">
              ‘다른’ 서비스는 단순 정보를 제공하며, 각 개별 컨텐츠의 저작권과 소유권을 보유하고 있지 않습니다. <br />
              ‘다른’ 서비스는 공신력 있는 매체가 아닙니다. 사이트에 있는 내용을 맹신하지 마세요.
            </p>
          </div>
        </div>
        <div className="flex gap-2"></div>
      </div>
    </ContentArea>
  </footer>
));

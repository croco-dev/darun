import { Button, ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다 - 다른',
};

export default function NotFound() {
  return (
    <Layout>
      <ContentArea>
        <div className="flex flex-col items-center justify-center gap-6 py-40 text-center">
          <div>
            <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
            <p className="mt-2 text-base text-dark-600">요청하신 페이지가 사라졌거나 잘못된 경로입니다.</p>
          </div>
          <Link href="/">
            <Button variant="shadow" color="primary">
              홈으로 돌아가기
            </Button>
          </Link>
        </div>
      </ContentArea>
    </Layout>
  );
}

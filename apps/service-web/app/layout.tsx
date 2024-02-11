import { pretendardFont } from '@croco/utils-next-font-pretendard';
import { Layout } from '@darun/ui-layout';
import { KumaRegistry } from '@kuma-ui/next-plugin/registry';
import { Metadata } from 'next';
import 'normalize.css/normalize.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'darun',
  description: 'darun.io',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={pretendardFont.className}>
        <KumaRegistry>
          <Layout>{children}</Layout>
        </KumaRegistry>
      </body>
    </html>
  );
}

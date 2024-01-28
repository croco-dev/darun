import 'normalize.css/normalize.css';
import './globals.css';

import { pretendardFont } from '@croco/utils-next-font-pretendard';
import { KumaRegistry } from '@kuma-ui/next-plugin/registry';
import { Metadata } from 'next';
import { ClientRootProvider } from './client';

export const metadata: Metadata = {
  title: 'darun',
  description: 'darun.io',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={pretendardFont.className}>
        <KumaRegistry>
          <ClientRootProvider>{children}</ClientRootProvider>
        </KumaRegistry>
      </body>
    </html>
  );
}

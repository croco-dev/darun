import 'normalize.css/normalize.css';
import './globals.css';

import { pretendardFont } from '@croco/utils-next-font-pretendard';
import { Layout } from '@darun/ui-layout';
import { KumaRegistry } from '@kuma-ui/next-plugin/registry';
import { Metadata } from 'next';
import { CookiesProvider } from 'next-client-cookies/server';
import { ReactNode } from 'react';
import { ClientRootProvider } from './client';
import { ServerRootProvider } from './server';

export const metadata: Metadata = {
  title: 'darun',
  description: 'darun.io',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className={pretendardFont.className}>
        <KumaRegistry>
          <CookiesProvider>
            <ServerRootProvider>
              <ClientRootProvider>
                <Layout>{children}</Layout>
              </ClientRootProvider>
            </ServerRootProvider>
          </CookiesProvider>
        </KumaRegistry>
      </body>
    </html>
  );
}

import 'normalize.css/normalize.css';
import './globals.css';

import { pretendardFont } from '@darun/utils-next-fonts';
import { KumaRegistry } from '@kuma-ui/next-plugin/registry';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'darun',
  description: 'darun.io',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={pretendardFont.className}>
        <KumaRegistry>{children}</KumaRegistry>
      </body>
    </html>
  );
}

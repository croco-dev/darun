import 'normalize.css/normalize.css';
import './globals.css';

import { KumaRegistry } from '@kuma-ui/next-plugin/registry';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'darun',
  description: 'darun.io',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <KumaRegistry>{children}</KumaRegistry>
      </body>
    </html>
  );
}

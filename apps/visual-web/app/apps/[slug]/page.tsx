import { gql } from '@apollo/client';
import { notFound } from '@darun/utils-router';
import { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { AppDetail } from '../../../features/apps';
import { container } from '../../serverContainer';
import { VisualLayout } from '../../VisualLayout';

const appQuery = gql`
  query AppDetailOnPageMetadata($slug: String!) {
    productBySlug(slug: $slug) {
      id
      name
      summary
    }
  }
`;

type AppMetadataData = {
  productBySlug?: {
    id: string;
    name: string;
    summary: string;
  } | null;
};

type Props = {
  params: Promise<{ slug: string }>;
};

const getApp = cache(async (slug: string) => {
  const client = container.serverApolloClient;
  const { data } = await client.query<AppMetadataData>({
    query: appQuery,
    variables: { slug },
  });

  return data?.productBySlug ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    return {};
  }

  return {
    title: `${app.name} — 다른 Visual`,
    description: `${app.name}의 화면과 플로 모음을 다른 Visual에서 만나보세요.`,
  };
}

function AppDetailSkeleton() {
  return (
    <main id="main-content" className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-6" aria-busy="true">
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" aria-hidden="true" />
        <div
          className="min-h-72 w-full animate-pulse rounded-2xl bg-surface-200 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="sr-only">앱을 불러오는 중</span>
      </div>
    </main>
  );
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const app = await getApp(slug);

  if (!app) {
    notFound();
  }

  return (
    <VisualLayout>
      <main id="main-content" className="w-full py-8 md:py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:gap-10 md:px-6">
          <Suspense fallback={<AppDetailSkeleton />}>
            <AppDetail slug={slug} />
          </Suspense>
        </div>
      </main>
    </VisualLayout>
  );
}

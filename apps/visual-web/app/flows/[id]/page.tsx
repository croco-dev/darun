import { gql } from '@apollo/client';
import { notFound } from '@darun/utils-router';
import { Metadata } from 'next';
import { cache, Suspense } from 'react';
import { FlowDetail } from '../../../features/flows';
import { container } from '../../serverContainer';
import { VisualLayout } from '../../VisualLayout';

const flowQuery = gql`
  query VisualFlowOnDetailPageMetadata($id: String!) {
    visualFlow(id: $id) {
      id
      title
      product {
        name
        slug
      }
    }
  }
`;

type VisualFlowMetadataData = {
  visualFlow?: {
    id: string;
    title: string;
    product: { name: string; slug: string };
  } | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

const getFlow = cache(async (id: string) => {
  const client = container.serverApolloClient;
  const { data } = await client.query<VisualFlowMetadataData>({
    query: flowQuery,
    variables: { id },
  });

  return data?.visualFlow ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const flow = await getFlow(id);

  if (!flow) {
    return {};
  }

  return {
    title: `${flow.title} — ${flow.product.name} — 다른 Visual`,
    description: `${flow.product.name}의 UX 플로 「${flow.title}」를 단계별 화면으로 만나보세요.`,
  };
}

function FlowDetailSkeleton() {
  return (
    <main id="main-content" className="w-full py-8 md:py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 md:px-6" aria-busy="true">
        <div className="h-8 w-2/3 animate-pulse rounded bg-surface-200 motion-reduce:animate-none" aria-hidden="true" />
        <div
          className="min-h-72 w-full animate-pulse rounded-2xl bg-surface-200 motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span className="sr-only">플로를 불러오는 중</span>
      </div>
    </main>
  );
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const flow = await getFlow(id);

  if (!flow) {
    notFound();
  }

  return (
    <VisualLayout>
      <Suspense fallback={<FlowDetailSkeleton />}>
        <FlowDetail id={id} />
      </Suspense>
    </VisualLayout>
  );
}

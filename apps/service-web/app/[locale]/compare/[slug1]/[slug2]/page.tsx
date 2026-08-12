import { gql } from '@apollo/client';
import { ProductCard } from '@darun/products-shell';
import { ContentArea, SectionHeader } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getClient } from '../../../../getServerClient';

const productsQuery = gql`
  query ProductsForCompare($slug1: String!, $slug2: String!, $locale: String!) {
    product1: productBySlug(slug: $slug1, locale: $locale) {
      id
      name
      slug
      summary
      logoUrl
      voteCount
      tags {
        id
        name
      }
      ownedCompany {
        name
      }
    }
    product2: productBySlug(slug: $slug2, locale: $locale) {
      id
      name
      slug
      summary
      logoUrl
      voteCount
      tags {
        id
        name
      }
      ownedCompany {
        name
      }
    }
  }
`;

type ProductData = {
  id: string;
  name: string;
  slug: string;
  summary?: string | null;
  logoUrl?: string | null;
  voteCount: number;
  tags: { id: string; name: string }[];
  ownedCompany?: { name: string };
};

type Props = {
  params: Promise<{ locale: string; slug1: string; slug2: string }>;
};

const getCompareProducts = cache(async ({ slug1, slug2, locale }: Awaited<Props['params']>) => {
  const { data } = await getClient().query<{
    product1?: ProductData;
    product2?: ProductData;
  }>({
    query: productsQuery,
    variables: { slug1, slug2, locale },
  });
  return data;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const data = await getCompareProducts(resolvedParams);

  const name1 = data?.product1?.name ?? resolvedParams.slug1;
  const name2 = data?.product2?.name ?? resolvedParams.slug2;

  return {
    title: `${name1} vs ${name2} 비교 - 다른`,
    description: `${name1}와 ${name2}를 나란히 비교해보세요.`,
  };
}

export default async function ComparePage({ params }: Props) {
  const resolvedParams = await params;
  const data = await getCompareProducts(resolvedParams);

  if (!data?.product1 || !data.product2) {
    return notFound();
  }

  const { product1, product2 } = data;

  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
          <SectionHeader title="서비스 비교" subtitle="두 서비스의 핵심 정보를 나란히 확인해보세요" align="center" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            <div data-testid="compare-column">
              <ProductCard
                product={product1}
                href={`/${resolvedParams.locale}/products/${product1.slug}`}
                source="compare"
              />
            </div>
            <div data-testid="compare-column">
              <ProductCard
                product={product2}
                href={`/${resolvedParams.locale}/products/${product2.slug}`}
                source="compare"
              />
            </div>
          </div>

          <div className="rounded-card-xl border border-dark-150 bg-white p-1 shadow-card">
            <CompareRow label="서비스명" colLabel1={product1.name} colLabel2={product2.name} value1={product1.name} value2={product2.name} testid="name" />
            <CompareRow label="설명" colLabel1={product1.name} colLabel2={product2.name} value1={product1.summary ?? undefined} value2={product2.summary ?? undefined} testid="summary" />
            <CompareRow
              label="회사"
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.ownedCompany?.name}
              value2={product2.ownedCompany?.name}
              testid="company"
            />
            <CompareRow
              label="투표 수"
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.voteCount.toString()}
              value2={product2.voteCount.toString()}
              testid="vote-count"
            />
            <CompareRow
              label="태그"
              colLabel1={product1.name}
              colLabel2={product2.name}
              value1={product1.tags.map(t => t.name).join(', ')}
              value2={product2.tags.map(t => t.name).join(', ')}
              testid="tags"
              isLast
            />
          </div>
        </ContentArea>
      </main>
    </Layout>
  );
}

function CompareRow({
  label,
  colLabel1,
  colLabel2,
  value1,
  value2,
  testid,
  isLast,
}: {
  label: string;
  colLabel1: string;
  colLabel2: string;
  value1?: string;
  value2?: string;
  testid: string;
  isLast?: boolean;
}) {
  return (
    <div className={`p-4 ${isLast ? '' : 'border-b border-dark-100'}`}>
      <div className="mb-3 border-b border-dark-100 pb-2 text-sm font-semibold text-dark-900">{label}</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-0 md:divide-x md:divide-dark-100">
        <div className="md:pr-4">
          <div className="mb-1 text-xs font-medium text-dark-500 md:hidden">{colLabel1}</div>
          <div className="text-sm leading-relaxed text-dark-800" data-testid={`compare-row-${testid}-1`}>
            {value1 || '-'}
          </div>
        </div>
        <div className="md:pl-4">
          <div className="mb-1 text-xs font-medium text-dark-500 md:hidden">{colLabel2}</div>
          <div className="text-sm leading-relaxed text-dark-800" data-testid={`compare-row-${testid}-2`}>
            {value2 || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

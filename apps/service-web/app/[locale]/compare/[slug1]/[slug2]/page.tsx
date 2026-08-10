import { gql } from '@apollo/client';
import { ContentArea, SectionHeader } from '@darun/ui';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getClient } from '../../../../getServerClient';

const productsQuery = gql`
  query ProductsForCompare($slug1: String!, $slug2: String!, $locale: String!) {
    product1: productBySlug(slug: $slug1, locale: $locale) {
      name
      summary
      logoUrl
      voteCount
      tags {
        name
      }
      ownedCompany {
        name
      }
    }
    product2: productBySlug(slug: $slug2, locale: $locale) {
      name
      summary
      logoUrl
      voteCount
      tags {
        name
      }
      ownedCompany {
        name
      }
    }
  }
`;

type Props = {
  params: Promise<{ locale: string; slug1: string; slug2: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: '서비스 비교 - 다른',
    description: '두 서비스를 나란히 비교해보세요.',
  };
}

export default async function ComparePage({ params }: Props) {
  const resolvedParams = await params;

  const { data } = await getClient().query<{
    product1?: {
      name: string;
      summary?: string;
      logoUrl?: string;
      voteCount: number;
      tags: { name: string }[];
      ownedCompany?: { name: string };
    };
    product2?: {
      name: string;
      summary?: string;
      logoUrl?: string;
      voteCount: number;
      tags: { name: string }[];
      ownedCompany?: { name: string };
    };
  }>({
    query: productsQuery,
    variables: {
      slug1: resolvedParams.slug1,
      slug2: resolvedParams.slug2,
      locale: resolvedParams.locale,
    },
  });

  if (!data?.product1 || !data.product2) {
    return notFound();
  }

  const { product1, product2 } = data;

  return (
    <ContentArea className="flex flex-col gap-8 py-6 md:gap-12 md:py-8">
      <SectionHeader title="서비스 비교" align="center" />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <div data-testid="compare-column">
          <ProductCard product={product1} />
        </div>
        <div data-testid="compare-column">
          <ProductCard product={product2} />
        </div>
      </div>

      <div className="flex flex-col gap-4 md:gap-5">
        <CompareRow label="서비스명" value1={product1.name} value2={product2.name} testid="name" />
        <CompareRow label="설명" value1={product1.summary} value2={product2.summary} testid="summary" />
        <CompareRow
          label="회사"
          value1={product1.ownedCompany?.name}
          value2={product2.ownedCompany?.name}
          testid="company"
        />
        <CompareRow
          label="투표 수"
          value1={product1.voteCount.toString()}
          value2={product2.voteCount.toString()}
          testid="vote-count"
        />
        <CompareRow
          label="태그"
          value1={product1.tags.map((t: { name: string }) => t.name).join(', ')}
          value2={product2.tags.map((t: { name: string }) => t.name).join(', ')}
          testid="tags"
        />
      </div>
    </ContentArea>
  );
}

function ProductCard({
  product,
}: {
  product: {
    name: string;
    summary?: string;
    logoUrl?: string;
    voteCount: number;
  };
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-card border border-dark-200 bg-white p-6 shadow-card">
      <img
        src={product.logoUrl || '/images/default-product-icon.svg'}
        alt={product.name}
        className="h-20 w-20 rounded-xl object-contain"
      />
      <h2 className="text-center text-xl font-bold text-dark-900">{product.name}</h2>
      {product.summary && <p className="text-center text-sm text-dark-500">{product.summary}</p>}
    </div>
  );
}

function CompareRow({
  label,
  value1,
  value2,
  testid,
}: {
  label: string;
  value1?: string;
  value2?: string;
  testid: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-dark-200 pb-4 md:grid-cols-3">
      <div className="font-medium text-dark-900">{label}</div>
      <div className="text-dark-700" data-testid={`compare-row-${testid}-1`}>
        {value1 || '-'}
      </div>
      <div className="text-dark-700" data-testid={`compare-row-${testid}-2`}>
        {value2 || '-'}
      </div>
    </div>
  );
}

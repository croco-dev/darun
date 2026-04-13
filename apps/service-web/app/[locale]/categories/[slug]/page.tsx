import { CategoryProductSection } from '@darun/products-shell';
import { ContentArea } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>;
};

const categoryMetadata: Record<string, { titleKo: string; titleEn: string; description: string }> = {
  design: {
    titleKo: '디자인 카테고리 - 다른',
    titleEn: 'Design Category - Darun',
    description: '디자인 툴과 서비스들을 모아놓은 카테고리입니다.',
  },
  development: {
    titleKo: '개발 카테고리 - 다른',
    titleEn: 'Development Category - Darun',
    description: '개발자를 위한 툴과 서비스들을 모아놓은 카테고리입니다.',
  },
  productivity: {
    titleKo: '생산성 카테고리 - 다른',
    titleEn: 'Productivity Category - Darun',
    description: '생산성을 높여주는 툴과 서비스들을 모아놓은 카테고리입니다.',
  },
  communication: {
    titleKo: '커뮤니케이션 카테고리 - 다른',
    titleEn: 'Communication Category - Darun',
    description: '커뮤니케이션 도구와 서비스들을 모아놓은 카테고리입니다.',
  },
  finance: {
    titleKo: '금융 카테고리 - 다른',
    titleEn: 'Finance Category - Darun',
    description: '금융 서비스와 도구들을 모아놓은 카테고리입니다.',
  },
  video: {
    titleKo: '영상 카테고리 - 다른',
    titleEn: 'Video Category - Darun',
    description: '영상 제작 및 편집 도구들을 모아놓은 카테고리입니다.',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const metadata = categoryMetadata[slug];

  if (!metadata) {
    return {
      title: '카테고리 - 다른',
      description: '서비스 카테고리입니다.',
    };
  }

  return {
    title: metadata.titleKo,
    description: metadata.description,
    openGraph: {
      title: metadata.titleKo,
      description: metadata.description,
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const metadata = categoryMetadata[slug];

  if (!metadata) {
    notFound();
  }

  return (
    <Layout>
      <main className="mt-2 flex flex-col gap-5">
        <ContentArea>
          <CategoryProductSection slug={slug} />
        </ContentArea>
      </main>
    </Layout>
  );
}

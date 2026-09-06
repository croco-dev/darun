import { ContentArea, PageHeading } from '@darun/ui';
import { Layout } from '@darun/ui-layout';
import { Metadata } from 'next';
import { getOgLocale } from '../../../lib/seo/metadata';
import { buildAlternates, normalizeLocale } from '../../../lib/seo/url';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const isKo = currentLocale === 'ko';

  const title = isKo ? '소개 및 편집 방침 - 다른' : 'About and Editorial Policy - Darun';
  const description = isKo
    ? '다른(darun)의 서비스 목적, 편집 원칙, 데이터 투명성 및 운영 방침을 안내합니다.'
    : 'Learn about Darun, our editorial curation policy, data transparency, and platform values.';

  const alternates = buildAlternates({
    locale: currentLocale,
    pathname: '/about',
    includeMarkdownAlternate: true,
  });

  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: '다른(darun)',
      locale: getOgLocale(currentLocale),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const currentLocale = normalizeLocale(locale);
  const isKo = currentLocale === 'ko';

  return (
    <Layout>
      <main className="flex w-full flex-col">
        <ContentArea className="flex flex-col gap-10 py-10 md:gap-12 md:py-16">
          <PageHeading
            title={isKo ? '다른(darun) 소개 및 편집 원칙' : 'About Darun and Editorial Policy'}
            subtitle={
              isKo
                ? '투명하고 신뢰할 수 있는 소프트웨어 탐색과 비교를 위한 darun.io의 원칙'
                : 'Principles guiding software discovery, comparison, and editorial integrity on darun.io'
            }
          />

          <article className="prose prose-neutral max-w-3xl text-dark-700">
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-dark-900">
                {isKo ? '1. 플랫폼 소개' : '1. About the Platform'}
              </h2>
              <p className="leading-relaxed text-dark-700">
                {isKo
                  ? '다른(darun)은 사용자가 자신의 업무, 개발, 창작 활동에 가장 적합한 소프트웨어와 디지털 도구를 손쉽게 발견하고, 나란히 비교하며, 직접 사용해보고 평가할 수 있도록 설계된 소프트웨어 디스커버리 플랫폼입니다. 수많은 도구들이 매일 쏟아지는 환경 속에서, 실제 사용자의 워크플로우에 진정한 가치를 더할 수 있는 양질의 서비스를 찾아내는 과정을 돕습니다.'
                  : 'Darun is a software discovery and evaluation platform designed to help builders, creators, and teams find, compare, and adopt the right tools for their workflows. In a rapidly expanding software ecosystem, Darun organizes software by use cases, capabilities, and direct alternatives to simplify technology decisions.'}
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-dark-900">
                {isKo ? '2. 상품 페이지와 제공 정보의 역할' : '2. Information Architecture on Product Pages'}
              </h2>
              <p className="leading-relaxed text-dark-700">
                {isKo
                  ? '각 상품 상세 페이지에서는 서비스의 핵심 개요와 기능, 사용자 투표 기반 인기도, 카테고리 태그, 운영 회사 정보, 그리고 공식 웹사이트 링크를 제공합니다. 또한 특정 서비스와 기능적으로 유사하거나 대체 가능한 ‘대안 서비스(Alternatives)’를 엄선하여 나란히 비교할 수 있는 기회를 제공합니다.'
                  : 'Every product page compiles core summaries, validated feature breakdowns, community-driven popularity signals, categorization tags, company background, and verified external web links. We also curate functional alternatives so that users can explore viable options before committing to a tool.'}
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-dark-900">
                {isKo ? '3. 편집 및 데이터 중립성 원칙' : '3. Editorial & Neutrality Policy'}
              </h2>
              <p className="leading-relaxed text-dark-700">
                {isKo
                  ? '다른(darun)은 데이터의 객관성과 신뢰성을 최우선으로 생각합니다. 광고주나 특정 벤더의 금전적 대가에 의해 제품 순위나 대안 목록이 임의로 조작되지 않으며, 사용자 커뮤니티의 실제 피드백과 투명한 기준에 따라 정렬됩니다. 생성형 AI를 활용한 요약 및 설명 역시 공식 출처의 정보를 기반으로 신뢰성을 검증한 뒤 제공됩니다.'
                  : 'Editorial integrity and objectivity are fundamental to Darun. Commercial sponsorships or paid placements never influence ranking order or alternative recommendations. When generative assistance is used to synthesize feature overviews, it adheres to strict provenance standards based on publicly verified sources.'}
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-dark-900">
                {isKo ? '4. 외부 출처 확인 안내' : '4. Verification with Primary Sources'}
              </h2>
              <p className="leading-relaxed text-dark-700">
                {isKo
                  ? '소프트웨어의 기능 명세, 가격 정책, 지원 플랫폼 및 이용 약관은 서비스 제공사의 사정에 따라 사전 공지 없이 변경될 수 있습니다. 다른(darun)에서 제공하는 정보는 사용자의 탐색을 돕기 위한 보조 자료이며, 최종 의사결정 시에는 각 제품 페이지에 제공된 외부 공식 웹사이트와 원본 출처를 반드시 함께 확인해 주시기 바랍니다.'
                  : 'Software specifications, pricing tiers, platform support, and terms of service evolve continuously. While Darun strives to maintain accurate and up-to-date data, users are strongly encouraged to verify critical specifications directly through the official primary links provided on each product page.'}
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-bold text-dark-900">
                {isKo ? '5. 운영 주체 및 문의' : '5. Operation and Feedback'}
              </h2>
              <p className="leading-relaxed text-dark-700">
                {isKo
                  ? '‘다른’ 서비스는 Croco 프로젝트 팀에서 기획하고 운영하고 있습니다. 서비스 관련 오류 제보, 등록 요청, 기능 제안은 하단 문의 링크를 통해 언제든지 전달해 주실 수 있습니다.'
                  : 'Darun is developed and maintained by the Croco project team. We welcome feature suggestions, data corrections, and feedback via our community contact channels.'}
              </p>
            </section>
          </article>
        </ContentArea>
      </main>
    </Layout>
  );
}

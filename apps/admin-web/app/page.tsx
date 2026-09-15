import { gql } from '@apollo/client';
import { PageShell } from '@darun/ui-admin';
import { getClient } from '@darun/utils-apollo-client/server';
import { Archive, ArrowRight, Building2, ExternalLink, Newspaper, Plus, Sliders, Sparkles } from 'lucide-react';
import Link from 'next/link';

const productsCountQuery = gql`
  query ProductsCountOnAdminDashboard {
    productsCount
  }
`;

async function getProductsCount(): Promise<number | null> {
  try {
    const { data } = await getClient({ static: true }).query<{
      productsCount: number;
    }>({
      query: productsCountQuery,
    });
    return data?.productsCount ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const productsCount = await getProductsCount();

  const sections = [
    {
      title: '서비스 관리',
      description:
        productsCount !== null
          ? `현재 총 ${productsCount.toLocaleString()}개의 프로덕트가 등록되어 관리 중입니다.`
          : '등록된 프로덕트 및 기능 정보, 스크린샷, 대안 서비스를 관리합니다.',
      icon: Archive,
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      listHref: '/products',
      newHref: '/products/new',
      newLabel: '서비스 추가',
      newIcon: Plus,
    },
    {
      title: '기업(운영사) 관리',
      description: '서비스 운영사 및 파트너 기업의 기본 정보와 개업일을 관리합니다.',
      icon: Building2,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      listHref: '/companies',
      newHref: '/companies/new',
      newLabel: '기업 추가',
      newIcon: Plus,
    },
    {
      title: '매거진 발행',
      description: '다른 매거진 아티클과 테크 트렌드 콘텐츠를 작성하고 발행합니다.',
      icon: Newspaper,
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      listHref: '/magazines',
      newHref: '/magazines/create',
      newLabel: '매거진 작성',
      newIcon: Plus,
    },
    {
      title: 'LLM & AI 설정',
      description: '번역 및 콘텐츠 자동 생성에 사용되는 LLM 엔드포인트와 API 키를 설정합니다.',
      icon: Sliders,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      listHref: '/settings/llm',
      newHref: '/settings/llm',
      newLabel: '설정 확인',
      newIcon: Sliders,
    },
  ];

  return (
    <PageShell title="대시보드">
      <div className="flex flex-col gap-6 max-w-6xl">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-dark-200 bg-gradient-to-br from-white via-surface-100/50 to-surface-100 p-6 sm:p-8 shadow-sm">
          <div className="relative z-10 flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900 text-white text-xs font-semibold w-fit">
              <Sparkles size={13} className="text-yellow-400" />
              다른 어드민 콘솔
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-dark-900">환영합니다, 관리자님 👋</h2>
            <p className="text-sm sm:text-base text-dark-600 max-w-2xl leading-relaxed">
              서비스 카탈로그, 운영사 데이터베이스, 매거진 발행 및 AI 연동 상태를 한곳에서 안전하고 신속하게 관리하세요.
            </p>
          </div>
        </div>

        {/* Quick Hub Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sections.map(section => {
            const ActionIcon = section.newIcon;
            return (
              <div
                key={section.title}
                className="flex flex-col justify-between rounded-2xl border border-dark-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-dark-300 hover:shadow-card-hover"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl border ${section.iconBg}`}>
                      <section.icon size={22} strokeWidth={1.75} />
                    </div>
                    <Link
                      href={section.newHref}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-dark-700 hover:text-dark-900 bg-surface-100 hover:bg-dark-100 px-2.5 py-1.5 rounded-lg transition"
                    >
                      <ActionIcon size={13} />
                      {section.newLabel}
                    </Link>
                  </div>
                  <h3 className="text-base font-bold text-dark-900 mb-1.5">{section.title}</h3>
                  <p className="text-xs text-dark-500 leading-relaxed mb-4">{section.description}</p>
                </div>

                <div className="pt-3 border-t border-dark-150/70 mt-auto">
                  <Link
                    href={section.listHref}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-dark-900 hover:text-blue-600 transition"
                  >
                    <span>관리 바로가기</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Status & Environment Info */}
        <div className="rounded-2xl border border-dark-200 bg-white p-6 shadow-card">
          <h3 className="text-sm font-bold text-dark-900 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            시스템 상태 및 운영 가이드
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface-100/60 border border-dark-150/70">
              <span className="text-dark-500 block mb-1">인프라 환경</span>
              <span className="font-mono font-bold text-dark-900 text-sm">
                {process.env['NEXT_PUBLIC_INFRA_ENV'] || process.env['NODE_ENV'] || 'local'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-100/60 border border-dark-150/70">
              <span className="text-dark-500 block mb-1">데이터 동기화</span>
              <span className="font-medium text-dark-800">
                {productsCount !== null
                  ? `GraphQL 정상 연동 (${productsCount.toLocaleString()}개 서비스)`
                  : 'GraphQL API 정상 연동 중'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-100/60 border border-dark-150/70 flex items-center justify-between">
              <div>
                <span className="text-dark-500 block mb-1">사용자 서비스 링크</span>
                <span className="font-medium text-dark-900">darun.io</span>
              </div>
              <a
                href="https://darun.io"
                target="_blank"
                rel="noreferrer noopener"
                className="p-1.5 rounded-lg text-dark-500 hover:text-dark-900 hover:bg-dark-100 transition"
                aria-label="사용자 웹사이트 열기"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

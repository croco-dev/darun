/** biome-ignore-all lint/security/noDangerouslySetInnerHtml: <explanation> */

import { MemoCard } from '@/components/MemoCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { getHighResImage } from '@/utils/image';
import { getTierBadgeColor, getTierLabel } from '@/utils/tier';
import { ChevronLeft, ExternalLink, HelpCircle } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

interface AppDetail {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  tier: number | null;
  appStoreId: string;
}

async function getAppDetail(id: string): Promise<AppDetail | null> {
  try {
    const { data, error } = await supabase
      .from('apps')
      .select(
        `
        id,
        name,
        description,
        icon_url,
        app_store_id,
        tiers (
          tier
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    if (data) {
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        iconUrl: data.icon_url,
        appStoreId: data.app_store_id,
        tier: data.tiers?.[0]?.tier || 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching app detail:', error);
    return null;
  }
}

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const { data, error } = await supabase.from('apps').select('id').limit(100);

    if (error) throw error;

    return (
      data?.map(app => ({
        id: app.id,
      })) || []
    );
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const app = await getAppDetail(id);

  if (!app) {
    return {
      title: '앱을 찾을 수 없음',
    };
  }

  const title = `${app.name} - ${getTierLabel(app.tier)}`;
  const description = app.description || `${app.name} 앱의 티어 랭킹 정보를 확인하세요.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: app.iconUrl
        ? [
            {
              url: app.iconUrl,
              width: 512,
              height: 512,
              alt: app.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: app.iconUrl ? [app.iconUrl] : undefined,
    },
  };
}

export default async function AppDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await getAppDetail(id);

  if (!app) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tier.darun.io';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: app.name,
    description: app.description || `${app.name} 앱의 티어 랭킹 정보`,
    applicationCategory: 'MobileApplication',
    operatingSystem: 'iOS',
    offers: {
      '@type': 'Offer',
      url: `https://apps.apple.com/app/id${app.appStoreId}`,
    },
    aggregateRating: app.tier
      ? {
          '@type': 'AggregateRating',
          ratingValue: app.tier,
          bestRating: 3,
          worstRating: 1,
        }
      : undefined,
    image: app.iconUrl,
    url: `${siteUrl}/apps/${app.id}`,
  };

  const tierBadge = (
    <Badge className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${getTierBadgeColor(app.tier)}`}>
      {getTierLabel(app.tier)}
    </Badge>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="page-shell py-8 md:py-10">
        <div className="space-y-5">
          <Link
            href="/apps"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />앱 목록으로
          </Link>

          <Card variant="default" className="gap-5 p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-[0.95rem] border border-border bg-background p-2 sm:size-24">
                {app.iconUrl ? (
                  <img
                    src={getHighResImage(app.iconUrl)}
                    alt={app.name}
                    className="size-full rounded-[20%] object-contain"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-[20%] bg-muted text-xs text-muted-foreground">
                    No Icon
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {app.tier ? <Link href={`/?tier=${app.tier}`}>{tierBadge}</Link> : tierBadge}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <HelpCircle className="size-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          <a
                            href="https://slashpage.com/croco/xjqy1g2v9dnjvm6vd54z"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            티어 기준 보기
                          </a>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div>
                  <h1 className="editorial-display text-[1.7rem] text-foreground md:text-[2rem]">{app.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-[15px]">
                    {app.description || '설명이 아직 등록되지 않았습니다.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-1">App Store ID {app.appStoreId}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <Button asChild>
                <a href={`https://apps.apple.com/app/${app.appStoreId}`} target="_blank" rel="noopener noreferrer">
                  App Store에서 보기
                  <ExternalLink className="size-4" />
                </a>
              </Button>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                랭킹으로 돌아가기
              </Link>
            </div>
          </Card>

          <Suspense fallback={null}>
            <MemoCard appId={app.id} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

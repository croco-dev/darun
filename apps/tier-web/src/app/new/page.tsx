import { AppCard } from '@/components/AppCard';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

export const revalidate = 0;

export default async function NewArrivalsPage() {
  const { data, error } = await supabase
    .from('apps')
    .select(
      `
      id,
      name,
      description,
      icon_url,
      created_at,
      tiers (
        tier
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error fetching apps:', error);
    return <div className="page-shell py-16">Error loading new arrivals</div>;
  }

  const apps = (data ?? []).map(app => ({
    id: app.id,
    name: app.name,
    description: app.description,
    iconUrl: app.icon_url,
    tier: app.tiers?.[0]?.tier || 0,
    createdAt: app.created_at,
  }));

  return (
    <div className="page-shell py-8 md:py-10">
      <section className="space-y-4 border-b border-border pb-6 md:pb-8">
        <div className="space-y-2">
          <p className="section-label">새로운 앱</p>
          <h1 className="editorial-display text-[1.9rem] text-foreground md:text-[2.2rem]">최근 추가된 앱</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-[15px]">
            가장 최근에 추가된 앱을 시간 순서대로 확인할 수 있습니다.
          </p>
        </div>

        <Card variant="default" className="gap-2 p-4 md:max-w-[220px]">
          <p className="text-sm font-medium text-foreground">총 {apps.length}개</p>
          <p className="text-xs text-muted-foreground">최근 수집 순</p>
        </Card>
      </section>

      <section className="space-y-3 pt-6 md:pt-8">
        <h2 className="text-base font-semibold text-foreground">목록</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {apps.map(app => (
            <AppCard
              key={app.id}
              id={app.id}
              name={app.name}
              description={app.description}
              iconUrl={app.iconUrl}
              tier={app.tier}
            />
          ))}
          {apps.length === 0 && (
            <Card variant="default" className="col-span-full p-8 text-center">
              <p className="text-sm text-muted-foreground">새로 추가된 앱이 없습니다.</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

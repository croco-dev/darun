import { Badge } from '@/components/ui/badge';
import { getHighResImage } from '@/utils/image';
import { getTierBadgeColor, getTierLabel } from '@/utils/tier';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface AppCardProps {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  tier: number | null;
}

export function AppCard({ id, name, description, iconUrl, tier }: AppCardProps) {
  const cleanDescription = description?.replace(/\s+/g, ' ').trim();

  return (
    <Link href={`/apps/${id}`} className="group block h-full min-w-0">
      <article className="flex h-full items-center gap-3 rounded-[var(--radius-glass-panel)] border border-border bg-card p-3 shadow-sm transition-colors hover:bg-accent/40 sm:p-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-[0.75rem] border border-border bg-background p-1.5 sm:size-15">
          {iconUrl ? (
            <img src={getHighResImage(iconUrl)} alt={name} className="size-full rounded-[20%] object-contain" />
          ) : (
            <div className="flex size-full items-center justify-center rounded-[20%] bg-muted text-[10px] text-muted-foreground">
              No Icon
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${getTierBadgeColor(tier)}`}>
              {getTierLabel(tier)}
            </Badge>
          </div>
          <h3 className="truncate text-[15px] font-semibold tracking-[-0.02em] text-foreground">{name}</h3>
          <p className="mt-1 line-clamp-1 text-sm leading-5 text-muted-foreground">
            {cleanDescription || '설명이 아직 등록되지 않았습니다.'}
          </p>
        </div>

        <div className="flex shrink-0 items-center text-muted-foreground">
          <ChevronRight className="size-4 transition-colors group-hover:text-foreground" />
        </div>
      </article>
    </Link>
  );
}

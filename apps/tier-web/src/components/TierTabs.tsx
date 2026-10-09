import { cn } from '@/lib/utils';
import Link from 'next/link';

const tiers = [
  { id: '1', label: '1티어' },
  { id: '2', label: '2티어' },
  { id: '3', label: '3티어' },
  { id: '0', label: '티어 없음' },
];

export function TierTabs({ currentTier }: { currentTier: string }) {
  return (
    <div className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full gap-4">
        {tiers.map(tier => {
          const isActive = currentTier === tier.id;

          return (
            <Link
              key={tier.id}
              href={`/?tier=${tier.id}`}
              className={cn(
                'relative -mb-px pb-3 text-sm text-muted-foreground transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:scale-x-0 after:bg-foreground after:transition-transform',
                isActive ? 'font-medium text-foreground after:scale-x-100' : 'hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {tier.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

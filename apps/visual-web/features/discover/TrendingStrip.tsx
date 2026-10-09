import { Link } from '@darun/utils-router';
import type { TrendingItem } from '../../app/page';
import { VISUAL_CARD_IMAGE_LOADING } from '../perf/imageLoading';

export function TrendingStrip({ items }: { items: TrendingItem[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="visual-home-trending-title" className="flex w-full flex-col gap-3">
      <h2 id="visual-home-trending-title" className="text-base font-bold text-dark-900 md:text-lg">
        지금 둘러볼 만한 화면
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {items.map(item => (
          <li key={item.id} className="w-40 shrink-0">
            <Link
              href={`/screenshots/${encodeURIComponent(item.id)}`}
              className="group block overflow-hidden rounded-2xl border border-dark-150 bg-white shadow-2xs transition hover:border-dark-300 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-surface-100">
                <img
                  src={item.imageUrl}
                  alt={item.imageAlt || item.title || `${item.productName} 스크린샷`}
                  loading={VISUAL_CARD_IMAGE_LOADING}
                  className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                />
              </div>
              <div className="flex flex-col gap-0.5 p-3">
                <span className="truncate text-xs font-bold text-dark-900">{item.title ?? item.imageAlt}</span>
                <span className="truncate text-xs text-dark-500">{item.productName}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

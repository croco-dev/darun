import { Sparkles } from '@darun/ui';

type ProductFeatureGridListProps = {
  features: {
    emoji?: string;
    id: string;
    name: string;
    summary?: string;
  }[];
};

export const ProductFeatureGridList = ({ features }: ProductFeatureGridListProps) => {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
      {features.map(feature => (
        <div
          className="flex w-full items-start gap-3 rounded-xl border border-dark-150/80 bg-surface-50/50 p-3 transition-all duration-200 hover:border-dark-300 hover:bg-white hover:shadow-2xs motion-reduce:transition-none"
          key={feature.id}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dark-150/80 bg-surface-100 shadow-2xs">
            {feature.emoji ? (
              <span className="text-lg leading-none sm:text-xl" aria-hidden="true">
                {feature.emoji}
              </span>
            ) : (
              <Sparkles size={18} className="text-dark-500 stroke-[1.75]" aria-hidden="true" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <h4 className="text-sm font-bold tracking-tight text-dark-900 break-keep">{feature.name}</h4>
            {feature.summary && <p className="text-xs leading-relaxed text-dark-600 break-keep">{feature.summary}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

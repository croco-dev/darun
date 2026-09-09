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
        <div className="flex w-full items-start gap-2.5 sm:gap-3" key={feature.id}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dark-150 bg-surface-100 shadow-2xs">
            <span className="text-lg leading-none sm:text-xl">{feature.emoji ?? '💎'}</span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold tracking-tight text-dark-900 break-keep">{feature.name}</p>
            {feature.summary && (
              <p className="text-xs font-normal leading-relaxed text-dark-600 break-keep">
                {feature.summary}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

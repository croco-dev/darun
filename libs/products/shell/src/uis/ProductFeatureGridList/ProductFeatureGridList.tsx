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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {features.map(feature => (
        <div className="flex w-full items-start gap-2 lg:gap-3" key={feature.id}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dark-100 bg-surface-100 lg:h-11 lg:w-11">
            <span className="text-base lg:text-xl">{feature.emoji ?? '💎'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold tracking-tight text-dark-800">{feature.name}</p>
            <p className="text-xs font-normal tracking-tight text-dark-600 [overflow-wrap:anywhere] leading-snug text-justify">
              {feature.summary}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

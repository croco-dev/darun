type ProductFeatureGridListProps = {
  features: {
    emoji?: string;
    id: string;
    name: string;
    summary?: string;
  }[];
};

export const ProductFeatureGridList = ({
  features,
}: ProductFeatureGridListProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => (
        <div
          className="flex w-full items-start gap-2 lg:gap-3"
          key={feature.id}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-dark-100 lg:h-[42px] lg:w-[42px]">
            <span className="text-[16px] lg:text-[20px]">
              {feature.emoji ?? "💎"}
            </span>
          </div>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[15px] font-semibold tracking-[-0.072px] text-dark-800">
              {feature.name}
            </p>
            <p className="text-[13px] font-normal tracking-[-0.1px] text-dark-600 [overflow-wrap:anywhere] leading-[1.3] text-justify">
              {feature.summary}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

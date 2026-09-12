import Image from 'next/image';

type FeatureItemProps = {
  emoji?: string;
  name: string;
  description?: string;
  screenshots?: {
    id: string;
    imageAlt: string;
    imageUrl: string;
  }[];
};

export const FeatureItem = ({ emoji, name, description, screenshots }: FeatureItemProps) => (
  <div className="rounded-card-lg border border-dark-150 bg-white p-5 shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none">
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dark-150 bg-surface-100 shadow-2xs">
          <span className="text-xl leading-none">{emoji ?? '💎'}</span>
        </div>
        <div className="flex flex-col">
          <p className="text-base font-semibold leading-tight tracking-tight text-dark-900 break-keep">{name}</p>
          {description && <p className="mt-1 text-sm leading-relaxed text-dark-600 break-keep">{description}</p>}
        </div>
      </div>
      {screenshots && screenshots.length > 0 && (
        <div className="flex w-full gap-3 overflow-x-auto rounded-xl bg-surface-100 p-2 scrollbar-hide touch-pan-x">
          {screenshots.map(screenshot => (
            <Image
              key={screenshot.id}
              src={screenshot.imageUrl}
              alt={screenshot.imageAlt}
              sizes="800px"
              width={800}
              height={220}
              className="h-[220px] w-auto rounded-lg border border-dark-150 object-contain"
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

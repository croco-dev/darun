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
  <div className="rounded-lg border border-black/10 bg-white px-4 py-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.08)]">
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-dark-100">
          <span className="text-[22px]">{emoji ?? '💎'}</span>
        </div>
        <div className="flex flex-col">
          <p className="text-[18px] font-bold tracking-[-0.072px] text-dark-900">{name}</p>
          {description && <p className="text-[14px] font-normal text-dark-600">{description}</p>}
        </div>
      </div>
      {screenshots && screenshots.length > 0 && (
        <div className="flex w-full gap-2 overflow-auto">
          {screenshots.map(screenshot => (
            <Image
              key={screenshot.id}
              src={screenshot.imageUrl}
              alt={screenshot.imageAlt}
              sizes="800px"
              width={800}
              height={220}
              className="h-[220px] w-auto rounded border border-black/[0.04] object-contain"
            />
          ))}
        </div>
      )}
    </div>
  </div>
);

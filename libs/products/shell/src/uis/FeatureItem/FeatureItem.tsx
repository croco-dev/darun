import { Sparkles } from '@darun/ui';
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
  <div className="group rounded-card-lg border border-dark-150 bg-white p-5 shadow-card transition-all duration-200 hover:border-dark-300 hover:shadow-card-hover sm:p-6">
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dark-150/90 bg-surface-100 shadow-2xs sm:h-11 sm:w-11">
          {emoji ? (
            <span className="text-xl leading-none">{emoji}</span>
          ) : (
            <Sparkles className="h-5 w-5 text-dark-500 stroke-[1.75]" />
          )}
        </div>
        <div className="flex flex-col pt-0.5">
          <h3 className="text-base font-bold leading-snug tracking-tight text-dark-900 break-keep sm:text-lg">{name}</h3>
          {description && <p className="mt-1 text-sm leading-relaxed text-dark-600 break-keep sm:text-base">{description}</p>}
        </div>
      </div>
      {screenshots && screenshots.length > 0 && (
        <div className="flex w-full gap-3 overflow-x-auto pt-1 scrollbar-hide snap-x snap-mandatory scroll-smooth scroll-pl-1 touch-pan-x">
          {screenshots.map(screenshot => (
            <div
              key={screenshot.id}
              className="shrink-0 snap-start"
            >
              <Image
                src={screenshot.imageUrl}
                alt={screenshot.imageAlt || `${name} feature screenshot`}
                sizes="800px"
                width={800}
                height={220}
                className="h-52 sm:h-60 w-auto rounded-xl border border-dark-150 bg-white object-contain shadow-2xs transition-all duration-200 hover:border-dark-300 hover:shadow-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

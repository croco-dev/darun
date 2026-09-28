import { Chip, formatDate, Sparkles } from '@darun/ui';
import { Link } from '@darun/utils-router';
import { useState } from 'react';

type ArticleCardProps = {
  thumbnailImageUri?: string;
  category?: string;
  title: string;
  summary?: string;
  author?: string;
  date?: Date;
  href?: string;
  locale?: string;
};

export const ArticleCard = ({
  thumbnailImageUri,
  category,
  title,
  date,
  author,
  summary,
  href,
  locale,
}: ArticleCardProps) => {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = thumbnailImageUri && !hasImageError;

  const content = (
    <>
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-100">
        {showImage ? (
          <img
            src={thumbnailImageUri}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
            onError={() => setHasImageError(true)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-100 text-dark-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dark-150/80 bg-white/90 text-dark-400 shadow-2xs">
              <Sparkles size={20} className="shrink-0 stroke-[1.75]" aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4 md:p-5">
        {category && (
          <div className="flex items-center">
            <Chip color="filledGray" variant="square">
              {category}
            </Chip>
          </div>
        )}
        <h3 className="text-base font-extrabold leading-snug tracking-tight text-dark-900 break-words [word-break:keep-all] transition-colors duration-200 group-hover:text-dark-950 md:text-lg">
          {title}
        </h3>
        {summary && (
          <p className="line-clamp-2 text-sm leading-relaxed text-dark-600 break-words [word-break:keep-all]">
            {summary}
          </p>
        )}
        <div className="mt-auto flex items-center gap-x-2 pt-3 text-xs text-dark-500">
          {author && <span className="max-w-[120px] truncate font-semibold text-dark-800">{author}</span>}
          {author && date && (
            <span aria-hidden="true" className="select-none text-dark-300">
              •
            </span>
          )}
          {date && (
            <time
              className="tabular-nums whitespace-nowrap"
              dateTime={date instanceof Date ? date.toISOString() : undefined}
            >
              {formatDate(date, '', locale)}
            </time>
          )}
        </div>
      </div>
    </>
  );

  const baseClassName =
    'group flex h-full flex-col overflow-hidden rounded-card-lg border border-dark-150/80 bg-white shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:shadow-card-hover active:translate-y-0 active:scale-[0.99] motion-reduce:transform-none motion-reduce:transition-none';

  if (href) {
    return (
      <Link
        href={href}
        className={`${baseClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-900/60 focus-visible:ring-offset-2`}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={`${baseClassName} focus-within:-translate-y-0.5 focus-within:border-dark-300 focus-within:shadow-card-hover`}
    >
      {content}
    </article>
  );
};

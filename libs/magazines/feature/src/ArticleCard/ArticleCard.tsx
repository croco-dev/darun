import { Chip, Sparkles } from '@darun/ui';

type ArticleCardProps = {
  thumbnailImageUri?: string;
  category?: string;
  title: string;
  summary?: string;
  author?: string;
  date?: Date;
};

function formatDate(date?: Date): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

export const ArticleCard = ({ thumbnailImageUri, category, title, date, author, summary }: ArticleCardProps) => {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card-lg border border-dark-150/80 bg-white shadow-card transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-dark-300 hover:shadow-card-hover focus-within:-translate-y-0.5 focus-within:border-dark-300 focus-within:shadow-card-hover motion-reduce:transform-none motion-reduce:transition-none">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-100">
        {thumbnailImageUri ? (
          <img
            src={thumbnailImageUri}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-100 via-surface-200 to-dark-100 text-dark-400">
            <Sparkles size={28} className="stroke-[1.5] text-dark-300" />
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
        <h3 className="text-base font-bold leading-tight tracking-tight text-dark-900 break-keep md:text-lg">
          {title}
        </h3>
        {summary && <p className="line-clamp-2 text-sm leading-relaxed text-dark-600 break-keep">{summary}</p>}
        <div className="mt-auto flex items-center gap-x-2 pt-3 text-xs text-dark-500">
          {author && <span className="font-medium text-dark-700">{author}</span>}
          {author && date && <span>•</span>}
          {date && <span>{formatDate(date)}</span>}
        </div>
      </div>
    </article>
  );
};

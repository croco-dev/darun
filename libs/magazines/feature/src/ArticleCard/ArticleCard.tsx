type ArticleCardProps = {
  thumbnailImageUri?: string;
  category?: string;
  title: string;
  summary?: string;
  author?: string;
  date?: Date;
};

export const ArticleCard = ({ thumbnailImageUri, category, title, date, author, summary }: ArticleCardProps) => {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-dark-150 bg-white shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:border-dark-200 hover:shadow-card-hover focus-within:-translate-y-1 focus-within:border-dark-200 focus-within:shadow-card-hover motion-reduce:transform-none motion-reduce:transition-none">
      {thumbnailImageUri && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={thumbnailImageUri}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transform-none motion-reduce:transition-none"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
        {category && <span className="text-xs font-semibold uppercase tracking-wide text-brown-600">{category}</span>}
        <h3 className="text-base font-bold leading-tight tracking-tight text-dark-900 md:text-lg">{title}</h3>
        {summary && <p className="line-clamp-2 text-sm leading-snug text-dark-500">{summary}</p>}
        <div className="mt-auto flex items-center gap-x-2 pt-2 text-xs text-dark-400">
          <span>{author}</span>
          <span>•</span>
          <span>{date?.toLocaleDateString()}</span>
        </div>
      </div>
    </article>
  );
};

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
    <div className="rounded-card border border-surface-300 bg-white shadow-card overflow-hidden transition-all duration-200 ease-out hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover focus-within:-translate-y-1 focus-within:border-brand-300 focus-within:shadow-card-hover motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex">
        {thumbnailImageUri && (
          <img src={thumbnailImageUri} alt={title} className="h-36 w-auto flex-shrink-0 object-cover" />
        )}
        <div className="flex flex-col justify-center p-4 pl-5 pr-5">
          {category && <div className="mb-1 text-xs font-bold uppercase text-dark-500">{category}</div>}
          <h3 className="mb-2 font-bold leading-tight text-dark-900">{title}</h3>
          {summary && <p className="mb-3 text-sm text-dark-600">{summary}</p>}
          <div className="flex items-center gap-x-2 text-xs text-dark-500">
            <span>{author}</span>
            <span>•</span>
            <span>{date?.toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

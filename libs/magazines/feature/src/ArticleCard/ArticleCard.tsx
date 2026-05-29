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
    <div className="overflow-hidden rounded-lg border border-dark-100 bg-white">
      <div className="flex">
        {thumbnailImageUri && (
          <img src={thumbnailImageUri} alt={title} className="h-36 w-auto flex-shrink-0 object-cover" />
        )}
        <div className="flex flex-col justify-center p-4 pl-5 pr-5">
          {category && <div className="mb-1 text-xs font-bold uppercase text-dark-500">{category}</div>}
          <h3 className="mb-2 font-bold leading-tight">{title}</h3>
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

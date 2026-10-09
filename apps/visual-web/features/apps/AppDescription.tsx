'use client';

import DOMPurify from 'isomorphic-dompurify';

const DESCRIPTION_CLASS =
  'max-w-3xl break-words text-sm leading-relaxed text-dark-700 [word-break:keep-all] [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-dark-900 [&_h3]:mb-1.5 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-dark-900 [&_p]:my-2.5 [&_ul]:my-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_a]:font-semibold [&_a]:text-dark-900 [&_a]:underline [&_a]:underline-offset-2 [&_code]:rounded-md [&_code]:bg-surface-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-surface-100 [&_pre]:p-4 [&_img]:h-auto [&_img]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto';

const TAG_RE = /<\/?[a-z][a-z0-9]*[\s>/]/i;

export function AppDescription({ description }: { description: string }) {
  const trimmed = description.trim();
  if (!trimmed) return null;
  if (!TAG_RE.test(trimmed)) {
    return (
      <p className="max-w-3xl whitespace-pre-line break-words text-sm leading-relaxed text-dark-700 [word-break:keep-all]">
        {trimmed}
      </p>
    );
  }
  return (
    <div
      className={DESCRIPTION_CLASS}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(trimmed, { FORBID_TAGS: ['style'], FORBID_ATTR: ['style'] }),
      }}
    />
  );
}

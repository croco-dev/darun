import type { ReactElement } from 'react';

type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  id?: string;
};

export function JsonLd({ data, id }: JsonLdProps): ReactElement {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" {...(id ? { id } : {})} dangerouslySetInnerHTML={{ __html: json }} />;
}

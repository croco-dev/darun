import type { ReactNode } from 'react';

export type ResearchEvidence = { anchors?: { sourceId: string; excerpt: string }[]; evidenceType?: string };

export type ResearchSource = { id: string; title: string; url: string; hostname: string; relationToInput?: string };

type ReviewSource = ResearchSource & { targetId: string };

export type ResearchFieldCitation = { targetId: string; label: string; evidence?: ResearchEvidence | null };

function evidenceLabel(type: string | undefined) {
  switch (type) {
    case 'INPUT_HOST':
      return '입력 사이트와 같은 호스트의 검색 근거';
    case 'SINGLE_EXTERNAL':
      return '외부 호스트 한 곳의 검색 근거';
    case 'MULTIPLE_EXTERNAL':
      return '여러 외부 호스트의 검색 근거';
    case 'NONE':
      return '분류된 검색 근거 없음';
  }
}

function sourceHref(value: string) {
  try {
    const url = new URL(value);
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    // 주소 형식이 잘못된 출처도 제목과 발췌는 읽을 수 있다.
  }
}

function SourceLink({ source }: { source: ResearchSource }) {
  const title = source.title || source.hostname;
  const href = sourceHref(source.url);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="underline">
      {title}
    </a>
  ) : (
    <span>{title}</span>
  );
}

export function ResearchFieldEvidence({
  field,
  sources,
  children,
}: {
  field: ResearchFieldCitation;
  sources: ReadonlyMap<string, ReviewSource>;
  children: ReactNode;
}) {
  const anchors = field.evidence?.anchors ?? [];
  const label = evidenceLabel(field.evidence?.evidenceType);

  return (
    <details className="min-w-0 rounded-lg border border-dark-200 bg-white px-3 py-2 text-sm [overflow-wrap:anywhere]">
      <summary id={field.targetId} className="cursor-pointer font-medium text-dark-800 target:text-dark-950">
        {field.label} 근거
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-dark-700">
        {children}
        {anchors.length === 0 ? (
          <p className="text-xs">연결된 발췌가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2 border-t border-dark-200 pt-3">
            <p className="text-xs font-semibold">조사 제안에 연결된 발췌</p>
            {label && <p className="text-xs">{label}</p>}
            <ul className="flex flex-col gap-2">
              {anchors.map((anchor, index) => {
                const source = sources.get(anchor.sourceId);
                return (
                  <li key={index} className="rounded-md bg-surface-100 p-3">
                    <blockquote className="whitespace-pre-wrap">{anchor.excerpt}</blockquote>
                    {source ? (
                      <div className="mt-2 flex flex-col items-start gap-1 text-xs">
                        <SourceLink source={source} />
                        <p>
                          {source.hostname} · {source.url}
                        </p>
                        <a
                          href={`#${encodeURIComponent(source.targetId)}`}
                          aria-label={`${source.title || source.hostname}의 인용 필드 보기`}
                          className="underline"
                        >
                          인용 필드 보기
                        </a>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs">연결된 출처를 찾을 수 없습니다.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function ResearchProposalValues({ original, current }: { original?: string | null; current: string }) {
  return (
    <dl className="flex flex-col gap-2">
      <div>
        <dt className="text-xs font-medium">조사 제안</dt>
        <dd className="whitespace-pre-wrap">{original || '제안 없음'}</dd>
      </div>
      {current !== (original ?? '') && (
        <div>
          <dt className="text-xs font-medium">현재 입력값</dt>
          <dd className="whitespace-pre-wrap">{current || '입력 없음'}</dd>
        </div>
      )}
    </dl>
  );
}

export function ResearchSourceList({
  sources,
  fields,
}: {
  sources: ReadonlyMap<string, ReviewSource>;
  fields: ResearchFieldCitation[];
}) {
  if (sources.size === 0) return null;

  return (
    <section className="flex min-w-0 flex-col gap-2 [overflow-wrap:anywhere]">
      <h3 className="text-sm font-semibold text-dark-800">근거 출처</h3>
      <ul className="flex flex-col gap-2 text-xs text-dark-700">
        {Array.from(sources.values(), source => {
          const citingFields = fields.filter(field =>
            field.evidence?.anchors?.some(anchor => anchor.sourceId === source.id)
          );
          return (
            <li
              key={source.id}
              id={source.targetId}
              tabIndex={-1}
              className="rounded-md border border-dark-200 p-2 target:border-dark-600"
            >
              <SourceLink source={source} /> · {source.hostname}
              {source.relationToInput === 'INPUT_HOST_MATCH' && ' · 입력 사이트와 같은 호스트 또는 하위 호스트'}
              <p>{source.url}</p>
              {citingFields.length > 0 && (
                <ul aria-label="인용한 필드" className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {citingFields.map(field => (
                    <li key={field.targetId}>
                      <a href={`#${encodeURIComponent(field.targetId)}`} className="underline">
                        {field.label} 근거
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

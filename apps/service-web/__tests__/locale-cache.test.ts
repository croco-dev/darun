import { gql, ApolloLink, Observable } from '@apollo/client';
import { describe, expect, it } from 'vitest';
import { container } from '../app/container';

const clientForLocale = container.getApolloClient;
const query = gql`
  query LocaleCacheRegression($locale: String!) {
    productBySlug(slug: "locale-cache-regression", locale: $locale) {
      __typename
      id
      name
      summary
      description
      voteCount
      features {
        __typename
        id
        name
        description
      }
    }
  }
`;

function product(locale: string, voteCount = 3) {
  return {
    __typename: 'Product',
    id: 'locale-cache-regression',
    name: locale === 'ko' ? '한국어 상품' : 'English product',
    summary: locale === 'ko' ? '한국어 요약' : 'English summary',
    description: locale === 'ko' ? '<p>한국어 본문</p>' : '<p>English body</p>',
    voteCount,
    features: [
      {
        __typename: 'Feature',
        id: 'locale-cache-feature',
        name: locale === 'ko' ? '한국어 기능' : 'English feature',
        description: locale === 'ko' ? '기능 설명' : 'Feature description',
      },
    ],
  };
}

function write(locale: string, voteCount = 3) {
  clientForLocale(locale).writeQuery({
    query,
    variables: { locale },
    data: { productBySlug: product(locale, voteCount) },
  });
}

function read(locale: string) {
  return clientForLocale(locale).readQuery({ query, variables: { locale } });
}

describe('locale-owned Apollo cache', () => {
  it('preserves product and normalized feature translations through ko → en → ko', () => {
    write('ko');
    write('en');
    expect(read('ko')).toEqual({ productBySlug: product('ko') });
    expect(read('en')).toEqual({ productBySlug: product('en') });
  });

  it('reuses the same locale cache and notifies its observers of vote updates', async () => {
    write('ko');
    const seen: unknown[] = [];
    const subscription = clientForLocale('ko')
      .watchQuery({ query, variables: { locale: 'ko' } })
      .subscribe(result => {
        seen.push(result.data);
      });
    try {
      write('ko', 8);
      expect(read('ko')).toEqual({ productBySlug: product('ko', 8) });
      await new Promise<void>(resolve => {
        queueMicrotask(resolve);
      });
      expect(seen).toContainEqual({ productBySlug: product('ko', 8) });
      expect(clientForLocale('ko')).toBe(clientForLocale('ko'));
    } finally {
      subscription.unsubscribe();
    }
    expect(seen).toContainEqual({ productBySlug: product('ko') });
  });

  it('does not let an earlier locale response overwrite the active locale', async () => {
    const ko = clientForLocale('ko');
    let respond: (() => void) | undefined;
    const originalLink = ko.link;
    ko.setLink(
      new ApolloLink(
        () =>
          new Observable(observer => {
            respond = () => {
              observer.next({ data: { productBySlug: product('ko', 5) } });
              observer.complete();
            };
          })
      )
    );
    try {
      const pending = ko.query({
        query,
        variables: { locale: 'ko' },
        fetchPolicy: 'network-only',
      });
      write('en', 11);
      expect(respond).toBeDefined();
      respond!();
      await pending;
      expect(read('en')).toEqual({ productBySlug: product('en', 11) });
      expect(read('ko')).toEqual({ productBySlug: product('ko', 5) });
    } finally {
      ko.setLink(originalLink);
    }
  });
});

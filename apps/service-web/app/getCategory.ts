import { notFound } from '@darun/utils-router';
import { cache } from 'react';
import { graphql } from '../../../libs/__generated__/gql';
import { getClient } from './getServerClient';

const categoryQuery = graphql(`
  query CategoryBySlugOnCategoryPageMetadata($slug: String!) {
    categoryBySlug(slug: $slug) {
      id
      slug
      labelKo
      labelEn
    }
  }
`);

const getCategory = cache(async (slug: string) => {
  const { data } = await getClient().query({ query: categoryQuery, variables: { slug } });
  return data?.categoryBySlug ?? null;
});

export async function requireCategory(slug: string) {
  const category = await getCategory(slug);
  if (!category) notFound();
  return category;
}

import { gql } from '@apollo/client';
import { notFound } from '@darun/utils-router';
import { Metadata } from 'next';
import { cache } from 'react';
import { ScreenshotDetail } from '../../../features/screenshots';
import { container } from '../../serverContainer';
import { VisualLayout } from '../../VisualLayout';

const screenshotQuery = gql`
  query VisualScreenshotOnDetailPageMetadata($id: String!) {
    visualScreenshot(id: $id) {
      id
      title
      imageAlt
      product {
        name
        slug
      }
    }
  }
`;

type VisualScreenshotMetadataData = {
  visualScreenshot?: {
    id: string;
    title: string | null;
    imageAlt: string;
    product: { name: string; slug: string };
  } | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

const getScreenshot = cache(async (id: string) => {
  const client = container.serverApolloClient;
  const { data } = await client.query<VisualScreenshotMetadataData>({
    query: screenshotQuery,
    variables: { id },
  });

  return data?.visualScreenshot ?? null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const screenshot = await getScreenshot(id);

  if (!screenshot) {
    return {};
  }

  const title = `${screenshot.title ?? screenshot.imageAlt} — ${screenshot.product.name}`;
  return {
    title: `${title} — 다른 Visual`,
    description: `${screenshot.product.name}의 화면을 다른 Visual에서 만나보세요.`,
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const screenshot = await getScreenshot(id);

  if (!screenshot) {
    notFound();
  }

  return (
    <VisualLayout>
      <ScreenshotDetail id={id} />
    </VisualLayout>
  );
}

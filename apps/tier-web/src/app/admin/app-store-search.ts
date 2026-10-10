import { z } from 'zod';

const keywordSchema = z.string().trim().min(1).max(100);

const appleSearchResultSchema = z.object({
  trackId: z.number().int().positive(),
  trackName: z.string().trim().min(1),
  description: z.string().nullish(),
  artworkUrl512: z.string().url().nullish(),
});

const appleSearchResponseSchema = z.object({
  results: z.array(z.unknown()),
});

export type AppStoreApp = {
  app_store_id: string;
  name: string;
  description: string;
  icon_url: string;
};

export function parseAppStoreKeyword(value: unknown): string | null {
  const parsed = keywordSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseAppleSearchResponse(value: unknown): AppStoreApp[] | null {
  const response = appleSearchResponseSchema.safeParse(value);
  if (!response.success) return null;

  return response.data.results.flatMap(result => {
    const app = appleSearchResultSchema.safeParse(result);
    if (!app.success) return [];

    return {
      app_store_id: `id${app.data.trackId}`,
      name: app.data.trackName,
      description: app.data.description ?? '',
      icon_url: app.data.artworkUrl512 ?? '',
    };
  });
}

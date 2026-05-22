import { MetadataRoute } from 'next';

export function makeEntries(koUrl: string, enUrl: string, lastModified: Date): MetadataRoute.Sitemap {
  const alternates = {
    languages: {
      ko: koUrl,
      en: enUrl,
      'x-default': koUrl,
    },
  };
  return [
    { url: koUrl, lastModified, alternates },
    { url: enUrl, lastModified, alternates },
  ];
}

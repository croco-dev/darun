export const ProductLinkRole = {
  official: 'official',
  download: 'download',
  documentation: 'documentation',
  social: 'social',
  other: 'other',
} as const;

export type ProductLinkRole = (typeof ProductLinkRole)[keyof typeof ProductLinkRole];

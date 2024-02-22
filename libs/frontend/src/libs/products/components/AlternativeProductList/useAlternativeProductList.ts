export function useAlternativeProductList(): {
  products: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    summary: string;
    tags: { name: string }[];
  }[];
} {
  return {
    products: [
      {
        id: 'asdasd',
        name: 'asd',
        slug: 'asd',
        summary: 'asd',
        tags: [{ name: 'asd' }],
      },
    ],
  };
}

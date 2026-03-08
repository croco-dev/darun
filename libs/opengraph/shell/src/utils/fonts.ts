// Font
type NextRequestInit = RequestInit & {
  next?: {
    revalidate: number;
  };
};

const loadFont = async (url: string) => {
  const requestInit: NextRequestInit = {
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
    next: {
      revalidate: 86400,
    },
  };
  const res = await fetch(url, requestInit as RequestInit);
  return res.arrayBuffer();
};

export const getPretendardFontSet = async (): Promise<
  Array<{
    name: string;
    data: ArrayBuffer;
    style: 'normal';
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  }>
> => {
  return [
    {
      name: 'Pretendard',
      data: await loadFont('https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/woff/Pretendard-Regular.woff'),
      style: 'normal',
      weight: 400,
    },
    {
      name: 'Pretendard',
      data: await loadFont('https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/woff/Pretendard-Medium.woff'),
      style: 'normal',
      weight: 500,
    },
    {
      name: 'Pretendard',
      data: await loadFont('https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/woff/Pretendard-SemiBold.woff'),
      style: 'normal',
      weight: 600,
    },
    {
      name: 'Pretendard',
      data: await loadFont('https://cdn.jsdelivr.net/npm/pretendard/dist/web/static/woff/Pretendard-Bold.woff'),
      style: 'normal',
      weight: 700,
    },
  ];
};

import { OgDefaultFrame, useImageResponse } from '@darun/frontend';

export default async function Image() {
  return await useImageResponse(
    <OgDefaultFrame
      type={'front'}
      name={'darun.io'}
      description={'다른 팀이 손수 비교한 서비스들을 찾고, 쓰고, 평가합니다.'}
    />
  );
}

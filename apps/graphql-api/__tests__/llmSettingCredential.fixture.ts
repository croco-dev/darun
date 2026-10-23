import { randomUUID } from 'node:crypto';

export function createCredentialCoercionFixture(prefix: 'synthetic' | 'synthetic-http') {
  // 호출마다 생성해 각 테스트의 원문 값이 Sentry ContextLines 소스에 남지 않게 한다.
  const arraySecret = `${prefix}-array-${randomUUID()}`;
  const objectSecret = `${prefix}-object-${randomUUID()}`;
  const nestedSecret = `${prefix}-nested-${randomUUID()}`;
  const escapedSecret = `${prefix}-escaped-${randomUUID()}-"quote"-\\slash-\nline`;
  const mapSecret = `${prefix}-map-${randomUUID()}`;
  const nestedMapSecret = `${prefix}-nested-map-${randomUUID()}`;
  const frameSecret = `${prefix}-frame-${randomUUID()}`;
  const multilineProperty = `${prefix}-property-${randomUUID()}\n    at ${frameSecret} (marker)\nend`;
  const escapedProperty = `${prefix}-property-${randomUUID()}-"quote"-\\slash-\\nline`;
  const coercionCases = [
    { name: 'array', value: [arraySecret], secrets: [arraySecret], echoed: [arraySecret] },
    { name: 'object', value: { token: objectSecret }, secrets: [objectSecret], echoed: [objectSecret] },
    {
      name: 'type/id protocol properties',
      value: { type: objectSecret, id: nestedSecret },
      secrets: [objectSecret, nestedSecret],
      echoed: [objectSecret, nestedSecret],
    },
    {
      name: 'nested and escaped',
      value: { tokens: [nestedSecret], nested: { token: escapedSecret } },
      secrets: [nestedSecret, escapedSecret],
      echoed: [nestedSecret, JSON.stringify(escapedSecret).slice(1, -1)],
    },
    { name: 'credential-keyed map', value: { [mapSecret]: false }, secrets: [mapSecret], echoed: [mapSecret] },
    {
      name: 'nested credential-keyed map',
      value: { mapping: { [nestedMapSecret]: true } },
      secrets: [nestedMapSecret],
      echoed: [nestedMapSecret],
    },
    {
      name: 'multiline fake-frame property',
      value: { [multilineProperty]: false },
      secrets: [multilineProperty, frameSecret],
      echoed: [multilineProperty],
    },
    {
      name: 'escaped property',
      value: { [escapedProperty]: false },
      secrets: [escapedProperty],
      echoed: [escapedProperty],
    },
  ];

  return { coercionCases, escapedSecret, mapSecret };
}

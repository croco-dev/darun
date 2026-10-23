import { expect, it } from 'vitest';
import { normalizeHomeTier } from './home-app-list';

it.each([undefined, ['0'], '-1', '4', '1x', '01', '1.5', 'NaN', ''])(
  'normalizes invalid tier %s to the default tab',
  value => {
    expect(normalizeHomeTier(value)).toBe(1);
  }
);
it.each(['0', '1', '2', '3'])('preserves valid tier %s', value => {
  expect(normalizeHomeTier(value)).toBe(Number(value));
});

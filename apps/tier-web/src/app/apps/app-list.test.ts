import { expect, it } from 'vitest';
import { buildAppsSearchFilter, mapAppListRow } from './app-list';

it.each([
  ['Hello, world (beta)', 'name.ilike."%Hello, world (beta)%",description.ilike."%Hello, world (beta)%"'],
  ['Say "hello"', String.raw`name.ilike."%Say \"hello\"%",description.ilike."%Say \"hello\"%"`],
  [String.raw`100%_\done`, String.raw`name.ilike."%100\\%\\_\\\\done%",description.ilike."%100\\%\\_\\\\done%"`],
])('serializes %s as one literal pattern in each OR condition', (term, expectedFilter) => {
  expect(buildAppsSearchFilter(term)).toBe(expectedFilter);
});

it('preserves assigned tier from the unique one-to-one relation and defaults absent assignments to zero', () => {
  const app = { id: 'app', name: 'Example', description: null, icon_url: null };
  expect(mapAppListRow({ ...app, tiers: { tier: 1 } }).tier).toBe(1);
  expect(mapAppListRow({ ...app, tiers: { tier: 0 } }).tier).toBe(0);
  expect(mapAppListRow({ ...app, tiers: null }).tier).toBe(0);
});

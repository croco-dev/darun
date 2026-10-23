import { expect, it } from 'vitest';
import { mapAppListRow } from './app-list';

it('preserves assigned tier from the unique one-to-one relation and defaults absent assignments to zero', () => {
  const app = { id: 'app', name: 'Example', description: null, icon_url: null };
  expect(mapAppListRow({ ...app, tiers: { tier: 1 } }).tier).toBe(1);
  expect(mapAppListRow({ ...app, tiers: { tier: 0 } }).tier).toBe(0);
  expect(mapAppListRow({ ...app, tiers: null }).tier).toBe(0);
});

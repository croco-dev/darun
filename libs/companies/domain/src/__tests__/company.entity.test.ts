import { describe, expect, it } from 'vitest';

import { Company } from '../entities/Company';

describe('Company entity', () => {
  it('should set constructor properties', () => {
    const startAt = new Date('2024-01-01T00:00:00.000Z');

    const company = new Company({
      id: 'company-1',
      name: 'Darun Company',
      address: 'Seoul',
      type: 'startup',
      startAt,
    });

    expect(company.id).toBe('company-1');
    expect(company.name).toBe('Darun Company');
    expect(company.address).toBe('Seoul');
    expect(company.type).toBe('startup');
    expect(company.startAt).toBe(startAt);
  });
});

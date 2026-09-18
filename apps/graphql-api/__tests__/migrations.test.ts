import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { validateJournalEntries, type JournalEntry } from '../scripts/migrate';

describe('database migrations', () => {
  describe('validateJournalEntries', () => {
    it('throws when entries array is empty', () => {
      expect(() => validateJournalEntries([])).toThrow('no entries');
    });

    it('throws when timestamps are equal or decreasing', () => {
      const invalidEntries: JournalEntry[] = [
        {
          idx: 0,
          version: '7',
          when: 100,
          tag: '0000_first',
          breakpoints: true,
        },
        {
          idx: 1,
          version: '7',
          when: 100,
          tag: '0001_second',
          breakpoints: true,
        },
      ];
      expect(() => validateJournalEntries(invalidEntries)).toThrow('ordering error');

      const decreasingEntries: JournalEntry[] = [
        {
          idx: 0,
          version: '7',
          when: 200,
          tag: '0000_first',
          breakpoints: true,
        },
        {
          idx: 1,
          version: '7',
          when: 100,
          tag: '0001_second',
          breakpoints: true,
        },
      ];
      expect(() => validateJournalEntries(decreasingEntries)).toThrow('ordering error');
    });

    it('passes when timestamps are strictly increasing', () => {
      const validEntries: JournalEntry[] = [
        {
          idx: 0,
          version: '7',
          when: 100,
          tag: '0000_first',
          breakpoints: true,
        },
        {
          idx: 1,
          version: '7',
          when: 200,
          tag: '0001_second',
          breakpoints: true,
        },
        {
          idx: 2,
          version: '7',
          when: 300,
          tag: '0002_third',
          breakpoints: true,
        },
      ];
      expect(() => validateJournalEntries(validEntries)).not.toThrow();
    });
  });

  describe('migration files and journal on disk', () => {
    const migrationsFolder = join(__dirname, '..', 'scripts', 'migrations');
    const journalPath = join(migrationsFolder, 'meta', '_journal.json');

    it('journal file exists and is valid JSON', () => {
      expect(existsSync(journalPath)).toBe(true);
      const content = readFileSync(journalPath, 'utf8');
      const journal = JSON.parse(content);
      expect(journal.dialect).toBe('postgresql');
      expect(Array.isArray(journal.entries)).toBe(true);
      expect(journal.entries.length).toBeGreaterThan(0);
    });

    it('journal entries have strictly increasing timestamps', () => {
      const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
      expect(() => validateJournalEntries(journal.entries)).not.toThrow();
    });

    it('every journal entry has a corresponding .sql file on disk', () => {
      const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
      for (const entry of journal.entries) {
        const sqlPath = join(migrationsFolder, `${entry.tag}.sql`);
        expect(existsSync(sqlPath), `Migration file not found: ${sqlPath}`).toBe(true);
        const sqlContent = readFileSync(sqlPath, 'utf8');
        expect(sqlContent.trim().length).toBeGreaterThan(0);
      }
    });

    it('every journal entry has a unique idx and tag', () => {
      const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
      const indices = new Set<number>();
      const tags = new Set<string>();

      for (const entry of journal.entries) {
        expect(indices.has(entry.idx), `Duplicate index: ${entry.idx}`).toBe(false);
        expect(tags.has(entry.tag), `Duplicate tag: ${entry.tag}`).toBe(false);
        indices.add(entry.idx);
        tags.add(entry.tag);
      }
    });
  });
});

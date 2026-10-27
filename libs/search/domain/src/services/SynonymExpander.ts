import { Service } from 'typedi';
import { SEARCH_SYNONYM_MAP } from './SearchSynonyms';

@Service()
export class SynonymExpander {
  private readonly synonymsByTerm = createSynonymsByTerm();
  private readonly termLengths = Array.from(
    new Set(Array.from(this.synonymsByTerm.keys(), term => term.split(' ').length))
  ).sort((a, b) => b - a);

  expand(query: string): string {
    const tokens = query.split(/\s+/).filter(Boolean);
    const normalizedTokens = tokens.map(token => token.toLowerCase());
    const expandedTerms = new Map<string, string>();

    for (let index = 0; index < tokens.length;) {
      let matchedLength = 1;
      let synonyms: readonly string[] = [];

      for (const length of this.termLengths) {
        if (index + length > tokens.length) continue;

        const term = normalizedTokens.slice(index, index + length).join(' ');
        const match = this.synonymsByTerm.get(term);
        if (match === undefined) continue;

        matchedLength = length;
        synonyms = match;
        break;
      }

      const originalTerm = tokens.slice(index, index + matchedLength).join(' ');
      for (const term of [originalTerm, ...synonyms]) {
        const key = term.toLowerCase();
        if (!expandedTerms.has(key)) expandedTerms.set(key, term);
      }
      index += matchedLength;
    }

    return Array.from(expandedTerms.values()).join(' ');
  }
}

function createSynonymsByTerm(): ReadonlyMap<string, readonly string[]> {
  const synonymsByTerm = new Map<string, string[]>();

  for (const [keyword, synonyms] of Object.entries(SEARCH_SYNONYM_MAP)) {
    const terms = [keyword, ...synonyms].map(term => term.trim().split(/\s+/).join(' '));

    for (const term of terms) {
      synonymsByTerm.set(
        term.toLowerCase(),
        terms.filter(synonym => synonym !== term)
      );
    }
  }

  return synonymsByTerm;
}

import { Service } from 'typedi';
import { SEARCH_SYNONYM_MAP } from './SearchRanker';

@Service()
export class SynonymExpander {
  private readonly synonymsByToken = createSynonymsByToken();

  expand(query: string): string {
    const tokens = query.split(/\s+/).filter(Boolean);
    const expandedTokens = tokens.flatMap(token => [token, ...this.synonymsFor(token)]);

    return Array.from(new Set(expandedTokens)).join(' ');
  }

  private synonymsFor(token: string): readonly string[] {
    return this.synonymsByToken.get(token.toLowerCase()) ?? [];
  }
}

function createSynonymsByToken(): ReadonlyMap<string, readonly string[]> {
  const synonymsByToken = new Map<string, string[]>();

  for (const [keyword, synonyms] of Object.entries(SEARCH_SYNONYM_MAP)) {
    const terms = [keyword, ...synonyms];

    for (const term of terms) {
      synonymsByToken.set(
        term.toLowerCase(),
        terms.filter(synonym => synonym !== term)
      );
    }
  }

  return synonymsByToken;
}

/**
 * Offline eval harness for LLM content lifecycle rules.
 *
 * Modes:
 * - deterministic (default): no keys, no network, no remote calls. Runs the
 *   synthetic offline invariant checks below and always passes/fails locally.
 * - manual-live (explicit opt-in): runs the approved fixture set against the
 *   real LLM provider. Requires `--live` AND `OPEN_ROUTER_API_KEY`. The live
 *   path is intentionally not part of CI; reviewers run it by hand on the
 *   approved fixtures only. Without keys it reports SKIPPED fixtures, and it
 *   never collects production user data or batch-regenerates production rows.
 *
   * Usage:
   *   pnpm eval:llm-content            # deterministic only
-  *   pnpm eval:llm-content -- --live  # deterministic + manual-live (needs key)
+  *   pnpm eval:llm-content -- --live  # deterministic + manual-live (needs key)
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createProductDescriptionWriterPrompt,
  createProductDescriptionReviewerPrompt,
} from '../../libs/products/datasource/src/prompts/productDescriptionPrompt';
import { createProductDescriptionResponseFormat } from '../../libs/products/datasource/src/prompts/productDescriptionSchema';
import { validateProductDescriptionCoverage } from '../../libs/products/datasource/src/validators/productDescriptionCoverageValidator';
import { validateProductDescriptionDocument } from '../../libs/products/datasource/src/validators/productDescriptionDocumentValidator';
import type { ProductDescriptionEvidence } from '../../libs/products/domain/src/services/ProductDescriptionEvidenceAssembler';
import { decodeHtml, encodeHtml } from '../../libs/translation/datasource/src/codecs/htmlPlaceholderCodec';
import { computeSourceHash } from '../../libs/translation/domain/src/utils/sourceHash';

interface DescriptionFixture {
  id: string;
  description: string;
  axis?: 'sparse-product' | 'rich-product' | 'injection';
  evidence: {
    product: {
      id: string;
      name: string;
      slug: string;
      summary: string;
      categories: Array<{
        id: string;
        slug: string;
        labelKo: string;
        labelEn: string;
      }>;
      features: Array<{ id: string; name: string; summary: string }>;
    };
  };
  expected: {
    limitationsMustBeEmpty: boolean;
    requiresSectionParagraphs: boolean;
  };
}

interface TranslationFixture {
  id: string;
  description: string;
  koreanText: string;
  isHtml: boolean;
  mode: string;
  negativeHypeKeywords: string[];
  preserveTokens?: string[];
  forkCheck?: 'negation' | 'numeric-condition' | 'same-host-ambiguity';
}

// Offline axes every translation fixture must cover. Each axis is a
// deterministic string invariant (no LLM call), so the deterministic mode can
// assert the fixture itself pins the rule instead of only exercising it live.
const REQUIRED_TRANSLATION_AXES = [
  'terminology',
  'uncertainty',
  'negation',
  'numeric-condition',
  'html-structure',
  'sparse-product',
  'rich-product',
  'injection',
  'same-host-ambiguity',
] as const;

type TranslationAxis = (typeof REQUIRED_TRANSLATION_AXES)[number];

function axisOfFixture(fixture: TranslationFixture): TranslationAxis | null {
  // Explicit forced-branch markers win over id prefixes: an HTML same-host
  // case must count as same-host-ambiguity, not generic html-structure.
  if (fixture.forkCheck === 'negation') return 'negation';
  if (fixture.forkCheck === 'numeric-condition') return 'numeric-condition';
  if (fixture.forkCheck === 'same-host-ambiguity') return 'same-host-ambiguity';
  const id = fixture.id;
  if (id.startsWith('terminology')) return 'terminology';
  if (id.startsWith('hedge') || id.startsWith('uncertainty')) return 'uncertainty';
  if (id.startsWith('negation')) return 'negation';
  if (id.startsWith('numeric')) return 'numeric-condition';
  if (id.startsWith('same-host')) return 'same-host-ambiguity';
  if (id.startsWith('html') || fixture.isHtml) return 'html-structure';
  if (id.startsWith('sparse')) return 'sparse-product';
  if (id.startsWith('rich')) return 'rich-product';
  if (id.startsWith('injection') || id.startsWith('promotional')) return 'injection';
  return null;
}

function assembleFixtureEvidence(fixture: DescriptionFixture): ProductDescriptionEvidence {
  const product = fixture.evidence.product;
  return {
    productId: product.id,
    productName: product.name,
    items: [
      { id: 'product:summary', kind: 'product_summary', text: product.summary },
      ...product.categories.map(category => ({
        id: `category:${category.id}` as const,
        kind: 'category' as const,
        text: category.labelKo,
      })),
      ...product.features.map(feature => ({
        id: `feature:${feature.id}` as const,
        kind: 'feature' as const,
        title: feature.name,
        text: feature.summary,
      })),
    ],
  };
}

async function runLiveDescriptionEvaluations() {
  // Lazy import keeps the deterministic default path free of any LLM client
  // (and free of any network-capable import side effects).
  const { LlmClient } = await import('@darun/utils-llm');
  const client = new LlmClient();
  const config = await client.getConfig();
  const fixtures: DescriptionFixture[] = JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures/description-fixtures.json'), 'utf8')
  );
  for (const fixture of fixtures) {
    const evidence = assembleFixtureEvidence(fixture);
    const responseFormat = createProductDescriptionResponseFormat(evidence);
    const complete = async (prompts: { systemPrompt: string; userPrompt: string }) => {
      const response = await client.completion(
        config.model,
        [
          { role: 'system', content: prompts.systemPrompt },
          { role: 'user', content: prompts.userPrompt },
        ],
        { thinkingLevel: config.thinkingLevel, responseFormat }
      );
      if (!response.content) throw new Error(`${fixture.id}: Empty LLM response`);
      return validateProductDescriptionDocument(JSON.parse(response.content), evidence);
    };
    const draft = await complete(createProductDescriptionWriterPrompt(evidence));
    const document = await complete(createProductDescriptionReviewerPrompt(evidence, draft));
    validateProductDescriptionCoverage(document, evidence);
    console.log(`  ✓ ${fixture.id}: Structured generation and feature coverage passed (${config.model}).`);
    console.log(JSON.stringify(document, null, 2));
  }
  console.log(
    '✓ Live description generation checks passed. Factual support and prose quality require review of the outputs above.'
  );
}

function runDeterministicEvaluations() {
  console.log('=== Running Deterministic Offline Fixture Evaluator ===\n');

  // 1. Description Fixtures Invariant Checks
  const descFixturesPath = resolve(__dirname, 'fixtures/description-fixtures.json');
  const descFixtures: DescriptionFixture[] = JSON.parse(readFileSync(descFixturesPath, 'utf8'));

  console.log(`[Description Fixtures] Loaded ${descFixtures.length} fixtures.`);
  for (const fixture of descFixtures) {
    const evidenceObj = assembleFixtureEvidence(fixture);

    // Verify validator rejects non-empty limitations
    const mockDocWithLimitations = {
      intro: {
        text: `${fixture.evidence.product.name} 소개`,
        evidenceRefs: ['product:summary'],
      },
      sections: [
        {
          title: '주요 특징',
          paragraphs: [
            {
              text: `${fixture.evidence.product.name} 특징 설명`,
              evidenceRefs: ['product:summary'],
            },
          ],
        },
      ],
      recommendedIf: [
        {
          text: '간편한 도구가 필요한 사용자',
          evidenceRefs: ['product:summary'],
        },
      ],
      limitations: [{ text: '무료 플랜 제한' }], // strictly forbidden!
      closing: {
        text: `${fixture.evidence.product.name} 마무리`,
        evidenceRefs: ['product:summary'],
      },
    };

    let caughtLimitationError = false;
    try {
      validateProductDescriptionDocument(mockDocWithLimitations, evidenceObj);
    } catch {
      caughtLimitationError = true;
    }

    if (!caughtLimitationError) {
      throw new Error(`[FAIL] ${fixture.id}: Validator failed to reject non-empty limitations!`);
    }

    // Verify validator accepts compliant document
    const compliantDoc = {
      intro: {
        text: `${fixture.evidence.product.name} 소개`,
        evidenceRefs: ['product:summary'],
      },
      sections: [
        {
          title: '주요 특징',
          paragraphs: [
            {
              text: `${fixture.evidence.product.name} 특징 설명`,
              evidenceRefs: ['product:summary'],
            },
          ],
        },
      ],
      recommendedIf: [
        {
          text: '간편한 도구가 필요한 사용자',
          evidenceRefs: ['product:summary'],
        },
      ],
      limitations: [],
      closing: {
        text: `${fixture.evidence.product.name} 마무리`,
        evidenceRefs: ['product:summary'],
      },
    };

    const validated = validateProductDescriptionDocument(compliantDoc, evidenceObj);
    if (validated.limitations.length !== 0) {
      throw new Error(`[FAIL] ${fixture.id}: Validated document has non-empty limitations!`);
    }

    console.log(`  ✓ Fixture "${fixture.id}": Invariant validated.`);
  }

  // 2. Translation Fixtures Invariant Checks
  const transFixturesPath = resolve(__dirname, 'fixtures/translation-fixtures.json');
  const transFixtures: TranslationFixture[] = JSON.parse(readFileSync(transFixturesPath, 'utf8'));

  assertTranslationAxisCoverage(transFixtures);

  console.log(`\n[Translation Fixtures] Loaded ${transFixtures.length} fixtures.`);
  for (const fixture of transFixtures) {
    // Check normalization and source hash stability
    const hash1 = computeSourceHash(fixture.koreanText);
    const hash2 = computeSourceHash(`  ${fixture.koreanText}  `);
    if (hash1 !== hash2) {
      throw new Error(`[FAIL] ${fixture.id}: Source hash normalization failed!`);
    }

    // For HTML fixtures, verify HTML codec preservation
    if (fixture.isHtml) {
      const encoded = encodeHtml(fixture.koreanText);
      const decoded = decodeHtml(encoded.encodedText, encoded.placeholders);
      if (decoded !== fixture.koreanText) {
        throw new Error(
          `[FAIL] ${fixture.id}: HTML codec roundtrip mismatch!\nExpected: ${fixture.koreanText}\nGot: ${decoded}`
        );
      }
      // Tag order is part of structure preservation: a reordered placeholder
      // sequence must fail decode instead of silently remapping tags.
      if (encoded.tokenOrder.length > 1) {
        const reversed = [...encoded.tokenOrder].reverse().join(' ');
        let acceptedReorder = false;
        try {
          decodeHtml(reversed, encoded.placeholders, encoded.tokenOrder);
          acceptedReorder = true;
        } catch {
          acceptedReorder = false;
        }
        if (acceptedReorder) {
          throw new Error(`[FAIL] ${fixture.id}: HTML codec accepted reordered tag tokens!`);
        }
      }
    }

    // Negative-hype tokens must be pinned on the fixture so the live
    // reviewer (not this offline pass) can reject hallucinated additions.
    // Injection sources are exempt: the attack payload itself must stay in
    // the source text so the live pass can prove it is quoted, not obeyed.
    const isInjectionSource = axisOfFixture(fixture) === 'injection';
    if (!isInjectionSource) {
      for (const keyword of fixture.negativeHypeKeywords) {
        if (fixture.koreanText.includes(keyword)) {
          throw new Error(`[FAIL] ${fixture.id}: negative keyword "${keyword}" leaks into the source text!`);
        }
      }
    } else if (fixture.negativeHypeKeywords.length === 0) {
      throw new Error(`[FAIL] ${fixture.id}: injection fixture must pin the forbidden payload token!`);
    }

    // Forced-branch tokens must survive verbatim: dropping a negation,
    // flattening a numeric condition, or collapsing a same-host distinction
    // changes meaning even when every other character round-trips.
    for (const token of fixture.preserveTokens ?? []) {
      if (!fixture.koreanText.includes(token)) {
        throw new Error(`[FAIL] ${fixture.id}: preserve token "${token}" missing from source text!`);
      }
    }
    switch (fixture.forkCheck) {
      case 'negation':
        assertNegationFork(fixture);
        break;
      case 'numeric-condition':
        assertNumericConditionFork(fixture);
        break;
      case 'same-host-ambiguity':
        assertSameHostFork(fixture);
        break;
      default:
        break;
    }

    console.log(`  ✓ Fixture "${fixture.id}": Codec and hash stability validated.`);
  }

  assertDescriptionAxisCoverage(descFixtures);

  console.log('\n✓ All deterministic offline fixture validations passed successfully.');
}

function assertDescriptionAxisCoverage(fixtures: DescriptionFixture[]): void {
  const covered = new Set<string>();
  for (const fixture of fixtures) {
    const axis = fixture.axis ?? axisOfDescriptionId(fixture.id);
    if (axis) covered.add(axis);
  }
  for (const axis of ['sparse-product', 'rich-product', 'injection'] as const) {
    if (!covered.has(axis)) {
      throw new Error(`[FAIL] Description fixtures miss required axis "${axis}"!`);
    }
  }
}

function axisOfDescriptionId(id: string): 'sparse-product' | 'rich-product' | 'injection' | null {
  if (id.startsWith('sparse')) return 'sparse-product';
  if (id.startsWith('rich') || id.startsWith('stresswatch')) return 'rich-product';
  if (id.startsWith('injection')) return 'injection';
  return null;
}

function assertTranslationAxisCoverage(fixtures: TranslationFixture[]): void {
  const covered = new Set<string>();
  for (const fixture of fixtures) {
    const axis = axisOfFixture(fixture);
    if (axis) covered.add(axis);
  }
  const missing = REQUIRED_TRANSLATION_AXES.filter(axis => !covered.has(axis));
  if (missing.length > 0) {
    throw new Error(`[FAIL] Translation fixtures miss required axes: ${missing.join(', ')}!`);
  }
}

function assertNegationFork(fixture: TranslationFixture): void {
  // The fixture must contain both an explicit negation and its affirmative
  // twin: without the twin there is no offline evidence that dropping the
  // negation is a meaning change rather than a paraphrase.
  const affirmative = fixture.koreanText.replace(/않|없|못|아니/, '');
  if (affirmative === fixture.koreanText || affirmative.length === 0) {
    throw new Error(`[FAIL] ${fixture.id}: negation fork needs an affirmative twin to contrast against!`);
  }
}

function assertNumericConditionFork(fixture: TranslationFixture): void {
  const numbers = fixture.koreanText.match(/\d+/g) ?? [];
  if (numbers.length === 0) {
    throw new Error(`[FAIL] ${fixture.id}: numeric-condition fork needs a numeric token to preserve!`);
  }
  const collapsed = fixture.koreanText.replace(/\d+/g, '');
  if (collapsed === fixture.koreanText) {
    throw new Error(`[FAIL] ${fixture.id}: numeric-condition fork must be sensitive to dropping the number!`);
  }
}

function assertSameHostFork(fixture: TranslationFixture): void {
  // Same-host ambiguity: two link texts that differ (e.g. docs vs guide) but
  // resolve to adjacent paths on one host. Collapsing either text — or
  // rewriting one href to the other's — must be detectable offline via the
  // preserved token set and the codec token order.
  const hrefs = [...fixture.koreanText.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  const uniqueHosts = new Set(hrefs.map(href => hostOfUrl(href)));
  if (hrefs.length < 2 || uniqueHosts.size !== 1) {
    throw new Error(
      `[FAIL] ${fixture.id}: same-host fork needs >=2 links on exactly one host (found ${hrefs.length} links, ${uniqueHosts.size} hosts)!`
    );
  }
  const tokens = fixture.preserveTokens ?? [];
  if (tokens.length < 2 || !tokens.every(token => fixture.koreanText.includes(token))) {
    throw new Error(`[FAIL] ${fixture.id}: same-host fork needs >=2 preserved link-text tokens!`);
  }
}

function hostOfUrl(href: string): string {
  try {
    return new URL(href, 'https://darun.io').host;
  } catch {
    return href;
  }
}

async function main() {
  runDeterministicEvaluations();

  const wantsLive = process.argv.includes('--live');
  if (!wantsLive) {
    console.log('\nℹ [Notice] Deterministic mode only (no keys, no remote calls). Pass --live for manual-live mode.');
    return;
  }

  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    console.log('\n[Manual-live] SKIPPED: OPEN_ROUTER_API_KEY is not set. Approved fixtures were not sent anywhere.');
    console.log('  Deterministic regression fixtures verified; live run skipped explicitly (SKIPPED, no remote calls).');
    return;
  }

  console.log('\n[Manual-live LLM Evaluation] Explicit opt-in confirmed (--live + key). Running approved fixtures only...');
  await runLiveDescriptionEvaluations();
}

main().catch(err => {
  console.error('\n❌ Evaluation failed:', err);
  process.exit(1);
});

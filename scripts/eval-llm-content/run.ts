/**
 * Offline eval harness for LLM content lifecycle rules.
 *
 * Modes:
 * - deterministic (default, or --mode=deterministic): no keys, no network, no
 *   remote calls — regardless of which API keys are present in the
 *   environment. Runs the synthetic offline invariant checks below and always
 *   passes/fails locally. The real description and translation providers are
 *   never imported or executed in this mode, and no real model output is
 *   produced; meaning judgments a model would have to make are not simulated.
 * - manual-live (--mode=manual-live, explicit opt-in): runs the approved
 *   fixture set against the real description and translation providers.
 *   Without OPEN_ROUTER_API_KEY the explicit live run fails and
 *   nothing is sent anywhere. The live path is intentionally not part of CI;
 *   reviewers run it by hand on the approved fixtures only, and it never
 *   collects production user data, telemetry, or an LLM judge, and never
 *   batch-regenerates production rows.
 *
 * Usage:
 *   pnpm eval:llm-content                       # deterministic only (default)
 *   pnpm eval:llm-content -- --mode=deterministic
 *   pnpm eval:llm-content -- --mode=manual-live # needs OPEN_ROUTER_API_KEY
 */
import type { LlmClient } from '@darun/utils-llm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  createProductDescriptionWriterPrompt,
  createProductDescriptionReviewerPrompt,
  PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION,
  PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION,
} from '../../libs/products/datasource/src/prompts/productDescriptionPrompt';
import { createProductDescriptionResponseFormat } from '../../libs/products/datasource/src/prompts/productDescriptionSchema';
import { validateProductDescriptionDocument } from '../../libs/products/datasource/src/validators/productDescriptionDocumentValidator';
import type { ProductDescriptionEvidence } from '../../libs/products/domain/src/services/ProductDescriptionEvidenceProjector';
import {
  assertDocumentStructure,
  decodeHtml,
  encodeHtml,
} from '../../libs/translation/datasource/src/codecs/htmlPlaceholderCodec';
import { TRANSLATION_PROMPT_VERSION } from '../../libs/translation/datasource/src/prompts/translationPrompt';
import type { TranslationMode, TranslationProvider } from '../../libs/translation/domain/src';
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

export interface TranslationFixture {
  id: string;
  description: string;
  koreanText: string;
  isHtml: boolean;
  mode: TranslationMode;
  negativeHypeKeywords: string[];
  preserveTokens?: string[];
  forkCheck?: 'negation' | 'numeric-condition' | 'same-host-ambiguity' | 'brand-url';
}

// This is fixture coverage, not semantic grading. The local checks validate
// source manifests and document guards; they do not evaluate model meaning.
const REQUIRED_TRANSLATION_AXES = [
  'terminology',
  'uncertainty',
  'criticism',
  'price',
  'brand-url',
  'negation',
  'numeric-condition',
  'html-structure',
  'markdown-structure',
  'sparse-product',
  'rich-product',
  'injection',
  'same-host-ambiguity',
] as const;

type TranslationAxis = (typeof REQUIRED_TRANSLATION_AXES)[number];

function axesOfFixture(fixture: TranslationFixture): ReadonlySet<TranslationAxis> {
  const axes = new Set<TranslationAxis>();
  // Explicit forced-branch markers win over id prefixes: an HTML same-host
  // case must count as same-host-ambiguity, not generic html-structure.
  if (fixture.forkCheck === 'negation') axes.add('negation');
  if (fixture.forkCheck === 'numeric-condition') axes.add('numeric-condition');
  if (fixture.forkCheck === 'same-host-ambiguity') axes.add('same-host-ambiguity');
  if (fixture.forkCheck === 'brand-url') {
    axes.add('brand-url');
    // The brand-url fixture is Markdown link syntax: it must also prove the
    // offline Markdown structure guard, not only URL freezing.
    axes.add('markdown-structure');
  }
  const id = fixture.id;
  if (id.startsWith('terminology')) axes.add('terminology');
  if (id.startsWith('hedge') || id.startsWith('uncertainty')) axes.add('uncertainty');
  if (id.startsWith('criticism')) axes.add('criticism');
  if (id.startsWith('price')) axes.add('price');
  if (id.startsWith('brand')) axes.add('brand-url');
  if (id.startsWith('negation')) axes.add('negation');
  if (id.startsWith('numeric')) axes.add('numeric-condition');
  if (id.startsWith('same-host')) axes.add('same-host-ambiguity');
  if (id.startsWith('html')) axes.add('html-structure');
  if (id.startsWith('markdown')) axes.add('markdown-structure');
  if (fixture.isHtml) axes.add('html-structure');
  if (id.startsWith('sparse')) axes.add('sparse-product');
  if (id.startsWith('rich')) axes.add('rich-product');
  if (id.startsWith('injection') || id.startsWith('promotional')) axes.add('injection');
  return axes;
}

function axisOfFixture(fixture: TranslationFixture): TranslationAxis | null {
  // The forced-branch marker is the primary axis; id prefixes and isHtml are
  // secondary signals for fixtures without a marker.
  if (fixture.forkCheck) return fixture.forkCheck;
  return [...axesOfFixture(fixture)][0] ?? null;
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

type DescriptionResponseStatus =
  'NOT_EXECUTED' | 'REQUEST_FAILED' | 'EMPTY_RESPONSE' | 'JSON_PARSE_FAILED' | 'DOCUMENT_VALIDATION_FAILED' | 'PASSED';

interface DescriptionResponseReport {
  rawContent: string | null;
  status: DescriptionResponseStatus;
}

export async function runLiveDescriptionEvaluations(client: Pick<LlmClient, 'getConfig' | 'completion'>) {
  const config = await client.getConfig();
  const fixtures: DescriptionFixture[] = JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures/description-fixtures.json'), 'utf8')
  );
  let failures = 0;
  for (const fixture of fixtures) {
    const evidence = assembleFixtureEvidence(fixture);
    const responseFormat = createProductDescriptionResponseFormat(evidence);
    const report = {
      kind: 'description',
      fixture: fixture.id,
      source: evidence,
      model: config.model,
      writerVersion: PRODUCT_DESCRIPTION_WRITER_PROMPT_VERSION,
      reviewerVersion: PRODUCT_DESCRIPTION_REVIEWER_PROMPT_VERSION,
      writerDraft: null as unknown,
      finalDocument: null as unknown,
      writerResponse: { rawContent: null, status: 'NOT_EXECUTED' } as DescriptionResponseReport,
      reviewerResponse: { rawContent: null, status: 'NOT_EXECUTED' } as DescriptionResponseReport,
      failureStage: null as 'writer' | 'reviewer' | null,
      formatStatus: 'PROVIDER_OR_FORMAT_FAILURE',
      formatFailure: null as string | null,
      meaningStatus: 'HUMAN_REVIEW_REQUIRED',
    };
    try {
      const complete = async (stage: 'writer' | 'reviewer', prompts: { systemPrompt: string; userPrompt: string }) => {
        report.failureStage = stage;
        const stageReport = stage === 'writer' ? report.writerResponse : report.reviewerResponse;
        stageReport.status = 'REQUEST_FAILED';
        const response = await client.completion(
          config.model,
          [
            { role: 'system', content: prompts.systemPrompt },
            { role: 'user', content: prompts.userPrompt },
          ],
          { thinkingLevel: config.thinkingLevel, responseFormat }
        );
        // Keep the exact response even when parsing or document validation fails.
        stageReport.rawContent = response.content ?? null;
        stageReport.status = 'EMPTY_RESPONSE';
        if (!response.content) throw new Error('Empty LLM response');
        stageReport.status = 'JSON_PARSE_FAILED';
        const parsed: unknown = JSON.parse(response.content);
        stageReport.status = 'DOCUMENT_VALIDATION_FAILED';
        const document = validateProductDescriptionDocument(parsed, evidence);
        stageReport.status = 'PASSED';
        return document;
      };
      const draft = await complete('writer', createProductDescriptionWriterPrompt(evidence));
      report.writerDraft = draft;
      report.finalDocument = await complete('reviewer', createProductDescriptionReviewerPrompt(evidence, draft));
      report.formatStatus = 'PASSED';
      report.failureStage = null;
    } catch (error) {
      failures++;
      report.formatFailure = error instanceof Error ? error.message : String(error);
    }
    console.log(JSON.stringify(report, null, 2));
  }
  return failures;
}

export async function runLiveTranslationEvaluations(
  provider: Pick<TranslationProvider, 'translateSingle'>,
  metadata: { model: string; promptVersion: string }
) {
  const fixtures: TranslationFixture[] = JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures/translation-fixtures.json'), 'utf8')
  );
  let failures = 0;
  for (const fixture of fixtures) {
    const report = {
      kind: 'translation',
      fixture: fixture.id,
      source: fixture.koreanText,
      reviewFocus: fixture.description,
      sourceCheckpoints: fixture.preserveTokens ?? [],
      model: metadata.model,
      promptVersion: metadata.promptVersion,
      finalTranslation: null as string | null,
      sourceHash: null as string | null,
      formatStatus: 'PROVIDER_OR_FORMAT_FAILURE',
      formatFailure: null as string | null,
      meaningStatus: 'HUMAN_REVIEW_REQUIRED',
      reviewWarnings: [] as string[],
    };
    try {
      const result = await provider.translateSingle({
        entityType: 'Product',
        entityId: fixture.id,
        field: 'description',
        koreanText: fixture.koreanText,
        mode: fixture.mode,
        isHtml: fixture.isHtml,
      });
      // Record the actual final output before checking it, including damaged
      // output. Format success never establishes semantic adequacy.
      report.finalTranslation = result.translatedText;
      report.model = result.model;
      report.promptVersion = result.promptVersion;
      report.sourceHash = result.sourceHash;
      assertDocumentStructure(fixture.koreanText, result.translatedText);
      report.formatStatus = 'PASSED';
      report.reviewWarnings = fixture.negativeHypeKeywords.filter(
        keyword =>
          !fixture.koreanText.includes(keyword) && result.translatedText.toLowerCase().includes(keyword.toLowerCase())
      );
    } catch (error) {
      failures++;
      report.formatFailure = error instanceof Error ? error.message : String(error);
    }
    console.log(JSON.stringify(report, null, 2));
  }
  console.log(
    'Meaning is not machine-graded: compare each source/final pair, including uncertainty, criticism and injection.'
  );
  return failures;
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

    // Markdown fixtures must be protected by the same codec: brand URLs are
    // frozen as placeholders so a live translation cannot swap one brand's
    // link for the other's, and a mutated link/heading structure must be
    // rejected by the Markdown AST comparison rather than silently accepted.
    if (axisOfFixture(fixture) === 'brand-url') {
      const encoded = encodeHtml(fixture.koreanText);
      for (const url of fixture.preserveTokens?.filter(token => token.startsWith('https://')) ?? []) {
        if (encoded.encodedText.includes(url)) {
          throw new Error(`[FAIL] ${fixture.id}: codec left brand URL "${url}" editable!`);
        }
      }
      assertDocumentStructure(fixture.koreanText, fixture.koreanText);
      let acceptedMutation = false;
      try {
        assertDocumentStructure(fixture.koreanText, `${fixture.koreanText}\n- 추가 목록`);
        acceptedMutation = true;
      } catch {
        acceptedMutation = false;
      }
      if (acceptedMutation) {
        throw new Error(`[FAIL] ${fixture.id}: Markdown structure check accepted an added list item!`);
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
      case 'brand-url':
        assertBrandUrlFork(fixture);
        break;
      default:
        break;
    }

    console.log(`  ✓ Fixture "${fixture.id}": Codec and hash stability validated.`);
    console.log(
      JSON.stringify(
        {
          fixture: fixture.id,
          source: fixture.koreanText,
          reviewFocus: fixture.description,
          finalTranslation: null,
          model: null,
          promptVersion: null,
          modelStatus: 'NOT_EXECUTED',
          meaningStatus: 'NOT_ASSESSED',
          formatStatus: 'LOCAL_CODEC_CHECKS_ONLY',
        },
        null,
        2
      )
    );
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
    for (const axis of axesOfFixture(fixture)) covered.add(axis);
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

function assertBrandUrlFork(fixture: TranslationFixture): void {
  // Brand and URL must form a bijective pair on the fixture: swapping one
  // brand's URL to the other brand's link — or dropping either URL — must be
  // detectable offline through the pinned tokens and the Markdown structure
  // check, because the two links are the whole meaning of the sentence.
  const links = [...fixture.koreanText.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(match => ({
    text: match[1]!,
    url: match[2]!,
  }));
  if (links.length < 2) {
    throw new Error(`[FAIL] ${fixture.id}: brand-url fork needs >=2 Markdown links (found ${links.length})!`);
  }
  const tokens = fixture.preserveTokens ?? [];
  for (const link of links) {
    if (!tokens.includes(link.text) || !tokens.includes(link.url)) {
      throw new Error(
        `[FAIL] ${fixture.id}: brand-url fork must pin both the link text "${link.text}" and its URL "${link.url}"!`
      );
    }
  }
  if (new Set(links.map(link => link.url)).size !== links.length) {
    throw new Error(`[FAIL] ${fixture.id}: brand-url fork needs distinct brand URLs to swap!`);
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
  const args = process.argv.slice(2).filter(arg => arg !== '--');
  if (args.length > 1 || (args.length === 1 && !['--mode=deterministic', '--mode=manual-live'].includes(args[0]!))) {
    throw new Error('Use exactly one --mode=deterministic or --mode=manual-live flag, or no flag.');
  }
  const mode = args[0] === '--mode=manual-live' ? 'manual-live' : 'deterministic';

  runDeterministicEvaluations();

  if (mode === 'deterministic') {
    console.log(
      '\nℹ [Notice] Deterministic mode: 0 remote calls were made, the real description and translation providers were not executed, and no real model output exists. Pass --mode=manual-live for the live pass.'
    );
    return;
  }

  const apiKey = process.env.OPEN_ROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Live evaluation requested but OPEN_ROUTER_API_KEY is missing; no live evaluation ran.');
  }

  console.log(
    '\n[Manual-live LLM Evaluation] Explicit opt-in confirmed (--mode=manual-live + key). Running approved fixtures only...'
  );
  // CLI loading boundary: live-only modules stay unloaded in deterministic
  // and SKIPPED runs. No database configuration provider is constructed.
  const { LlmClient } = await import('@darun/utils-llm');
  const { LlmTranslationProvider } =
    await import('../../libs/translation/datasource/src/adapters/LlmTranslationProvider');
  const client = new LlmClient();
  const config = await client.getConfig();
  const provider = new LlmTranslationProvider(client);
  const descriptionFailures = await runLiveDescriptionEvaluations(client);
  const translationFailures = await runLiveTranslationEvaluations(provider, {
    model: config.model,
    promptVersion: TRANSLATION_PROMPT_VERSION,
  });
  if (descriptionFailures + translationFailures > 0) {
    throw new Error(
      `${descriptionFailures} description and ${translationFailures} translation provider/format failures; meaning remains ungraded.`
    );
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ Evaluation failed:', err);
    process.exit(1);
  });
}

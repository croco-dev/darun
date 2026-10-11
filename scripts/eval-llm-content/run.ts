import { LlmClient } from '@darun/utils-llm';
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
    }

    console.log(`  ✓ Fixture "${fixture.id}": Codec and hash stability validated.`);
  }

  console.log('\n✓ All deterministic offline fixture validations passed successfully.');
}

async function main() {
  runDeterministicEvaluations();

  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    console.log(
      '\nℹ [Notice] OPEN_ROUTER_API_KEY is not set. Live LLM API evaluation skipped.\n  Deterministic regression fixtures verified (100% PASS).'
    );
    process.exit(0);
  }

  console.log('\n[Live LLM Evaluation] Running live model checks against fixtures...');
  await runLiveDescriptionEvaluations();
}

main().catch(err => {
  console.error('\n❌ Evaluation failed:', err);
  process.exit(1);
});

import type { Reporter, TestModule } from 'vitest/node';

const groups = {
  llm: {
    '__tests__/llmSettingConcurrency.pg.test.ts': 'LLM_SETTING_TEST_DATABASE_URL',
  },
  tier: {
    'src/remove-duplicates.pg.test.ts': 'DEDUPE_TEST_DATABASE_URL',
  },
  graphql: {
    '__tests__/jobConfigAttempts.pg.test.ts': 'JOB_CONFIG_ATTEMPTS_TEST_DATABASE_URL',
    '__tests__/translationIntegrity.pg.test.ts': 'TRANSLATION_TEST_DATABASE_URL',
    '__tests__/alternativeReplacement.pg.test.ts': 'ALTERNATIVE_TEST_DATABASE_URL',
    '__tests__/productDetailFreshness.pg.test.ts': 'PRODUCT_DETAIL_TEST_DATABASE_URL',
  },
  products: {
    'src/__tests__/W3AtomicApplyMaterialize.pg.test.ts': 'ATOMIC_TEST_DATABASE_URL',
    'src/__tests__/descriptionEvidence.postgresql.test.ts': 'DESCRIPTION_EVIDENCE_TEST_DATABASE_URL',
    'src/__tests__/W4JobLeaseRecovery.pg.test.ts': 'W4_DATABASE_URL',
  },
  baseline: {
    '__tests__/migrationBaseline.pg.test.ts': 'MIGRATION_BASELINE_TEST_DATABASE_URL',
  },
};

// Used only by the dedicated CI commands; ordinary local tests remain optional.
export default class RequiredPostgresReporter implements Reporter {
  private expected: string[] = [];

  onInit() {
    const group = process.env['REQUIRED_POSTGRES_GROUP'];
    if (!group || !Object.prototype.hasOwnProperty.call(groups, group)) {
      throw new Error('Required PostgreSQL suite group is missing or unknown');
    }
    const suites = groups[group as keyof typeof groups];
    this.expected = Object.keys(suites);
    for (const name of Object.values(suites)) {
      if (!process.env[name]?.trim()) throw new Error(`Required PostgreSQL test URL is missing: ${name}`);
    }
    if (group === 'products' && process.env['W4_PG'] !== '1') {
      throw new Error('Required PostgreSQL lease tests need W4_PG=1');
    }
  }

  onTestRunEnd(modules: ReadonlyArray<TestModule>) {
    for (const file of this.expected) {
      if (!modules.some(module => module.moduleId.replace(/\\/g, '/').endsWith(`/${file}`))) {
        throw new Error(`Required PostgreSQL suite was not collected: ${file}`);
      }
    }
    for (const module of modules) {
      const tests = [...module.children.allTests()];
      const passed = tests.filter(test => test.result().state === 'passed').length;
      const skipped = tests.filter(test => test.result().state === 'skipped').length;
      console.log(`[PostgreSQL integrity] ${module.moduleId}: ${passed}/${tests.length} passed, ${skipped} skipped`);
      if (module.state() !== 'passed' || tests.length === 0 || passed !== tests.length) {
        throw new Error(`Required PostgreSQL tests must all run and pass: ${module.moduleId}`);
      }
    }
  }
}

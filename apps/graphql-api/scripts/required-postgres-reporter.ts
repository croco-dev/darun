import type { Reporter, TestModule } from 'vitest/node';

// Used only by the dedicated CI commands; ordinary local tests remain optional.
export default class RequiredPostgresReporter implements Reporter {
  onInit() {
    for (const name of [
      'JOB_CONFIG_ATTEMPTS_TEST_DATABASE_URL',
      'TRANSLATION_TEST_DATABASE_URL',
      'ATOMIC_TEST_DATABASE_URL',
    ]) {
      if (!process.env[name]?.trim()) throw new Error(`Required PostgreSQL test URL is missing: ${name}`);
    }
  }

  onTestRunEnd(modules: ReadonlyArray<TestModule>) {
    if (modules.length === 0) throw new Error('Required PostgreSQL tests were not collected');
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

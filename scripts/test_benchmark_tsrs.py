import copy
import unittest

from benchmark_tsrs import cases_for, command_for, invalid_reasons, summarize


class BenchmarkEvidenceTests(unittest.TestCase):
    def sample(self):
        return dict(case='baseline', exit_code=0, timed_out=False, peak_bytes=100 * 1024 * 1024,
                    memory_events={}, tasks=68, cache='off', cost_cache_files=0,
                    seconds=10.0, cpu_seconds=20.0, invalid=[])

    def test_success_without_the_complete_workload_is_rejected(self):
        sample = self.sample()
        sample['tasks'] = 0
        self.assertIn('incomplete workload', invalid_reasons(sample, 68))

    def test_failed_or_memory_limited_samples_cannot_look_like_fast_successes(self):
        for field, value in [('exit_code', 1), ('timed_out', True), ('peak_bytes', 0),
                             ('memory_events', {'oom_kill': 1}), ('memory_events', {'max': 1})]:
            sample = self.sample()
            sample[field] = value
            self.assertTrue(invalid_reasons(sample, 68), field)

    def test_warm_cache_requires_evidence_that_a_cache_was_written(self):
        sample = self.sample()
        sample['cache'] = 'warm'
        self.assertIn('checker cost cache was not written', invalid_reasons(sample, 68))

    def test_missing_and_failed_repetitions_are_not_averaged_away(self):
        samples = [self.sample(), self.sample()]
        self.assertFalse(summarize(samples, ['baseline'], 3)[0]['valid'])
        failed = self.sample()
        failed['invalid'] = ['OOM']
        self.assertFalse(summarize(samples + [failed], ['baseline'], 3)[0]['valid'])

    def test_summary_keeps_worst_memory_and_median_elapsed_time(self):
        samples = [copy.deepcopy(self.sample()) for _ in range(3)]
        samples[0]['seconds'] = 1
        samples[2]['seconds'] = 100
        samples[2]['peak_bytes'] *= 3
        summary = summarize(samples, ['baseline'], 3)[0]
        self.assertEqual(summary['seconds_median'], 10)
        self.assertEqual(summary['peak_mib_median'], 100)
        self.assertEqual(summary['peak_mib_max'], 300)

    def test_checker_options_reach_tasks_and_do_not_become_turbo_options(self):
        case = next(c for c in cases_for('workspace') if c['name'] == 'c4-k2')
        command = command_for('workspace', case)
        self.assertIn('--concurrency=4', command)
        self.assertEqual(command[command.index('--') + 1:], ['--checkers', '2'])
        self.assertIn('--force', command)
        self.assertIn('--env-mode=strict', command)

    def test_standalone_workloads_use_the_existing_package_script(self):
        case = next(c for c in cases_for('tier-web') if c['name'] == 'k2')
        self.assertEqual(command_for('tier-web', case),
                         ['pnpm', '--filter', 'tier-web', 'run', 'typecheck:tsrs', '--checkers', '2'])


if __name__ == '__main__':
    unittest.main()

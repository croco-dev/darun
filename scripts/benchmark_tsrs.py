"""Compare type-check commands on Linux using a fresh cgroup v2 per sample.

Run the coordinator with sudo; measured commands run as the invoking user.
memory.peak includes the complete process tree and charged filesystem cache.
Turbo result caching and TypeScript incremental caching are disabled. OS page
cache is warmed, not dropped. Checker-cost cold/warm cases are reported apart.
"""

import argparse
import json
import os
from pathlib import Path
import platform
import pwd
import random
import re
import signal
import statistics
import subprocess
import sys
import time


MIB = 1024 * 1024
COST_CACHE = Path('.turbo/tsrs-benchmark-cost.json')
ANSI = re.compile(r'\x1b\[[0-9;]*m')


def cases_for(workload):
    if workload == 'workspace':
        cases = [
            ('c10-auto', 10, []), ('c4-auto', 4, []),
            ('c2-auto', 2, []), ('c1-auto', 1, []),
            ('c10-k2', 10, ['--checkers', '2']),
            ('c4-k2', 4, ['--checkers', '2']),
            ('c2-k2', 2, ['--checkers', '2']),
            ('c4-k1', 4, ['--checkers', '1']),
            ('c4-k4', 4, ['--checkers', '4']),
            ('c4-single', 4, ['--singleThreaded']),
            ('c2-single', 2, ['--singleThreaded']),
        ]
        prefix, concurrency, flags = 'c4-k2', 4, ['--checkers', '2']
    else:
        cases = [
            ('auto', None, []),
            ('k1', None, ['--checkers', '1']),
            ('k2', None, ['--checkers', '2']),
            ('k4', None, ['--checkers', '4']),
            ('single', None, ['--singleThreaded']),
        ]
        prefix, concurrency, flags = 'k2', None, ['--checkers', '2']
    result = [dict(name=name, concurrency=c, flags=f, cache='off') for name, c, f in cases]
    for limit in ['256M', '512M']:
        result.append(dict(name=f'{prefix}-memory-{limit}', concurrency=concurrency,
                           flags=flags + ['--maxMemory', limit], cache='off'))
    for state in ['cold', 'warm']:
        result.append(dict(name=f'{prefix}-cost-{state}', concurrency=concurrency,
                           flags=flags + ['--checkerCostCache', str(COST_CACHE)], cache=state))
    result.append(dict(name=f'{prefix}-go-eager', concurrency=concurrency,
                       flags=flags + ['--checkerAssignment', 'go', '--noLazyMembers'], cache='off'))
    return result


def command_for(workload, case):
    if workload == 'workspace':
        command = ['pnpm', 'exec', 'turbo', 'run', 'typecheck:tsrs',
                   f'--concurrency={case["concurrency"]}', '--force',
                   '--env-mode=strict', '--output-logs=errors-only']
        return command + (['--'] + case['flags'] if case['flags'] else [])
    return ['pnpm', '--filter', workload, 'run', 'typecheck:tsrs'] + case['flags']


def parse_counters(text):
    return {key: int(value) for key, value in (line.split() for line in text.splitlines())}


def invalid_reasons(sample, expected_tasks):
    reasons = []
    if sample['exit_code'] != 0:
        reasons.append(f'exit={sample["exit_code"]}')
    if sample['timed_out']:
        reasons.append('timeout')
    if sample['peak_bytes'] <= 0:
        reasons.append('missing memory measurement')
    if sample['memory_events'].get('oom', 0) or sample['memory_events'].get('oom_kill', 0):
        reasons.append('OOM')
    if sample['memory_events'].get('max', 0):
        reasons.append('cgroup safety limit reached')
    if sample['tasks'] != expected_tasks:
        reasons.append('incomplete workload')
    if sample['cache'] != 'off' and sample['cost_cache_files'] == 0:
        reasons.append('checker cost cache was not written')
    return reasons


def summarize(samples, names, rounds):
    result = []
    for name in names:
        group = [s for s in samples if s['case'] == name]
        valid = len(group) == rounds and all(not s['invalid'] for s in group)
        row = dict(case=name, valid=valid, samples=len(group),
                   invalid=[reason for s in group for reason in s['invalid']])
        if valid:
            row.update(seconds_median=statistics.median(s['seconds'] for s in group),
                       seconds_min=min(s['seconds'] for s in group),
                       seconds_max=max(s['seconds'] for s in group),
                       peak_mib_median=statistics.median(s['peak_bytes'] / MIB for s in group),
                       peak_mib_max=max(s['peak_bytes'] / MIB for s in group),
                       cpu_seconds_median=statistics.median(s['cpu_seconds'] for s in group))
        result.append(row)
    return result


def render_summary(report):
    env = report['environment']
    lines = [f'## tsrs: {report["workload"]}', '',
             f'Commit: `{env["commit"]}`; {env["image"]}; Node {env["node"]}; '
             f'{env["cpus"]} CPUs; RAM {env["memory_total_bytes"] / MIB:.0f} MiB.',
             f'Each sample has a fresh cgroup. Safety budget: {env["memory_budget_bytes"] / MIB:.0f} MiB. '
             'Peak includes all child processes and charged page cache; it is not per-process RSS.',
             'Turbo result/incremental caches are off; OS page cache is warm. '
             'Cost-warm primes its scheduling cache before each measured sample.', '',
             '| Case | Median seconds | Min–max seconds | Median / max peak MiB | CPU seconds |',
             '|---|---:|---:|---:|---:|']
    for row in report['summary']:
        if row['valid']:
            lines.append(f'| {row["case"]} | {row["seconds_median"]:.2f} | '
                         f'{row["seconds_min"]:.2f}–{row["seconds_max"]:.2f} | '
                         f'{row["peak_mib_median"]:.0f} / {row["peak_mib_max"]:.0f} | '
                         f'{row["cpu_seconds_median"]:.2f} |')
        else:
            lines.append(f'| {row["case"]} | INVALID | {"; ".join(row["invalid"])} | — | — |')
    return '\n'.join(lines) + '\n'


class Benchmark:
    def __init__(self, args):
        if sys.platform != 'linux' or os.geteuid() != 0:
            raise RuntimeError('Run on Linux with sudo; workload children run as SUDO_UID.')
        self.args = args
        self.root = Path(__file__).resolve().parent.parent
        self.uid = int(os.environ.get('SUDO_UID', os.getuid()))
        self.gid = int(os.environ.get('SUDO_GID', os.getgid()))
        self.user = pwd.getpwuid(self.uid)
        self.env = dict(os.environ, HOME=self.user.pw_dir, USER=self.user.pw_name,
                        CI='true', NO_COLOR='1', NEXT_TELEMETRY_DISABLED='1',
                        TURBO_TELEMETRY_DISABLED='1')
        self.output = Path(args.output).resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        self.counter = 0
        cgroup_root = Path('/sys/fs/cgroup')
        enabled = (cgroup_root / 'cgroup.subtree_control').read_text().split()
        if 'memory' not in enabled:
            (cgroup_root / 'cgroup.subtree_control').write_text('+memory')
        memory = {line.split(':')[0]: int(line.split()[1]) * 1024
                  for line in Path('/proc/meminfo').read_text().splitlines()}
        self.budget = int(min(memory['MemTotal'] * 0.8, memory['MemAvailable'] - 1024 * MIB))
        if self.budget < 1024 * MIB:
            raise RuntimeError('Insufficient free memory for an isolated benchmark.')
        plan = json.loads(self.capture(['pnpm', 'exec', 'turbo', 'run', 'typecheck:tsrs', '--dry=json']))
        tasks = [task for task in plan['tasks']
                 if task.get('command') and task['command'] != '<NONEXISTENT>']
        if args.workload != 'workspace':
            tasks = [task for task in tasks if task['package'] == args.workload]
        if not tasks:
            raise RuntimeError('No type-check tasks selected.')
        self.expected = len(tasks)
        self.packages = [self.root / task['directory'] for task in tasks]
        for directory in self.packages:
            cache_dir = directory / COST_CACHE.parent
            cache_dir.mkdir(exist_ok=True)
            os.chown(cache_dir, self.uid, self.gid)
        self.report = dict(workload=args.workload, rounds=args.rounds,
                           expected_tasks=self.expected, cases=cases_for(args.workload),
                           warmups=[], samples=[], summary=[], environment={
                               'commit': self.capture(['git', 'rev-parse', 'HEAD']).strip(),
                               'kernel': platform.release(),
                               'image': os.environ.get('ImageOS', '') + ' ' + os.environ.get('ImageVersion', ''),
                               'architecture': platform.machine(),
                               'cpus': len(os.sched_getaffinity(0)),
                               'cpu_model': next((line.split(':', 1)[1].strip() for line in
                                                  Path('/proc/cpuinfo').read_text().splitlines()
                                                  if line.startswith('model name')), ''),
                               'memory_total_bytes': memory['MemTotal'],
                               'memory_available_bytes': memory['MemAvailable'],
                               'memory_budget_bytes': self.budget,
                               'swap_total_bytes': memory['SwapTotal'],
                               'node': self.capture(['node', '--version']).strip(),
                               'pnpm': self.capture(['pnpm', '--version']).strip(),
                               'tsrs': self.capture(['pnpm', 'exec', 'tsrs', '--version']).strip(),
                               'run_url': ('https://github.com/' + os.environ.get('GITHUB_REPOSITORY', '')
                                           + '/actions/runs/' + os.environ.get('GITHUB_RUN_ID', '')),
                           })
        if not self.report['environment']['node'].startswith('v22.'):
            raise RuntimeError('Benchmark requires Node 22.')

    def drop_privileges(self):
        os.initgroups(self.user.pw_name, self.gid)
        os.setgid(self.gid)
        os.setuid(self.uid)

    def capture(self, command):
        return subprocess.check_output(command, cwd=self.root, env=self.env, text=True,
                                       preexec_fn=self.drop_privileges)

    def clear_cost_cache(self):
        for package in self.packages:
            (package / COST_CACHE).unlink(missing_ok=True)

    def measure(self, case, label):
        self.counter += 1
        cgroup = Path(f'/sys/fs/cgroup/darun-tsrs-{os.getpid()}-{self.counter}')
        cgroup.mkdir()
        process = None
        try:
            if not (cgroup / 'memory.peak').exists() or not (cgroup / 'cgroup.kill').exists():
                raise RuntimeError('cgroup v2 memory.peak and cgroup.kill are required.')
            (cgroup / 'memory.max').write_text(str(self.budget))
            (cgroup / 'memory.oom.group').write_text('1')

            def enter_cgroup():
                (cgroup / 'cgroup.procs').write_text(str(os.getpid()))
                self.drop_privileges()

            command = command_for(self.args.workload, case)
            log_path = self.output / f'{label}.log'
            started = time.monotonic()
            timed_out = False
            with log_path.open('w') as log:
                process = subprocess.Popen(command, cwd=self.root, env=self.env,
                                           stdout=log, stderr=subprocess.STDOUT,
                                           preexec_fn=enter_cgroup)

                def stop_on_timeout(_signum, _frame):
                    nonlocal timed_out
                    timed_out = True
                    (cgroup / 'cgroup.kill').write_text('1')

                previous_handler = signal.signal(signal.SIGALRM, stop_on_timeout)
                signal.setitimer(signal.ITIMER_REAL, self.args.timeout)
                try:
                    # A timed Popen.wait polls in 50 ms steps, biasing short samples.
                    exit_code = process.wait()
                finally:
                    signal.setitimer(signal.ITIMER_REAL, 0)
                    signal.signal(signal.SIGALRM, previous_handler)
            seconds = time.monotonic() - started
            output = ANSI.sub('', log_path.read_text())
            count = re.search(r'Tasks:\s+(\d+) successful, (\d+) total', output)
            tasks = int(count[1]) if count and count[1] == count[2] else 0
            if self.args.workload != 'workspace':
                tasks = int('tsrs --noEmit' in output and 'error TS' not in output)
            cpu = parse_counters((cgroup / 'cpu.stat').read_text())
            sample = dict(case=case['name'], cache=case['cache'], command=command,
                          seconds=seconds, exit_code=exit_code, timed_out=timed_out,
                          peak_bytes=int((cgroup / 'memory.peak').read_text()),
                          memory_events=parse_counters((cgroup / 'memory.events').read_text()),
                          cpu_seconds=cpu['usage_usec'] / 1_000_000,
                          tasks=tasks, cost_cache_files=sum((p / COST_CACHE).exists() for p in self.packages),
                          log=log_path.name)
            sample['invalid'] = invalid_reasons(sample, self.expected)
            print(json.dumps(sample), flush=True)
            return sample
        finally:
            if (cgroup / 'cgroup.kill').exists():
                (cgroup / 'cgroup.kill').write_text('1')
            if process is not None and process.poll() is None:
                process.wait(timeout=15)
            for _ in range(100):
                if not (cgroup / 'cgroup.procs').read_text().strip():
                    cgroup.rmdir()
                    break
                time.sleep(0.05)
            else:
                raise RuntimeError(f'Benchmark cgroup did not drain: {cgroup}')

    def save(self):
        self.report['summary'] = summarize(self.report['samples'],
                                            [c['name'] for c in self.report['cases']], self.args.rounds)
        (self.output / 'results.json').write_text(json.dumps(self.report, indent=2) + '\n')
        (self.output / 'summary.md').write_text(render_summary(self.report))

    def run(self):
        baseline = self.report['cases'][0]
        warmup = self.measure(baseline, 'initial-warmup')
        self.report['warmups'].append(warmup)
        self.save()
        if warmup['invalid']:
            raise RuntimeError('Baseline warmup failed; inspect initial-warmup.log.')
        for round_index in range(self.args.rounds):
            order = list(self.report['cases'])
            random.Random(101 + round_index).shuffle(order)
            for case in order:
                if case['cache'] != 'off':
                    self.clear_cost_cache()
                label = f'round-{round_index + 1}-{case["name"]}'
                if case['cache'] == 'warm':
                    prime = self.measure(case, label + '-prime')
                    self.report['warmups'].append(prime)
                    if prime['invalid']:
                        raise RuntimeError('Checker cost-cache warmup failed.')
                sample = self.measure(case, label)
                sample['round'] = round_index + 1
                self.report['samples'].append(sample)
                self.save()
        summary_path = os.environ.get('GITHUB_STEP_SUMMARY')
        if summary_path:
            with open(summary_path, 'a') as summary:
                summary.write(render_summary(self.report))
        if not self.report['summary'][0]['valid']:
            raise RuntimeError('Baseline failed during measured rounds.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workload', choices=['workspace', 'graphql-api', 'tier-web'], required=True)
    parser.add_argument('--rounds', type=int, choices=range(1, 6), default=3)
    parser.add_argument('--timeout', type=int, default=180)
    parser.add_argument('--output', required=True)
    Benchmark(parser.parse_args()).run()


if __name__ == '__main__':
    main()

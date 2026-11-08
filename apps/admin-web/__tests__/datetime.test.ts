import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const helperPath = fileURLToPath(new URL('../lib/datetime.ts', import.meta.url));

describe.each(['UTC', 'Asia/Seoul', 'America/Los_Angeles'])('관리자 시각 표시 (%s)', timezone => {
  it('입력의 instant를 보존하고 KST 형식·날짜 경계·DST를 동일하게 표시한다', () => {
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--import',
          'tsx',
          '--eval',
          `
            const { formatAsKst, parseAsUtc } = require(${JSON.stringify(helperPath)});
            const inputs = [
              new Date('2026-10-23T12:34:56Z'),
              '2026-10-23T12:34:56Z',
              '2026-10-23T21:34:56+09:00',
              '2026-10-23T05:34:56-0700',
              '2026-10-23 12:34:56',
            ];
            console.log(JSON.stringify({
              epochs: inputs.map(value => parseAsUtc(value).valueOf()),
              dates: inputs.map(value => formatAsKst(value, 'YYYY-MM-DD HH:mm:ss')),
              short: formatAsKst(inputs[0], 'YY-MM-DD HH:mm:ss'),
              offset: formatAsKst(inputs[0], 'YYYY-MM-DDTHH:mm:ssZ'),
              offsetLiterals: formatAsKst(inputs[0], '[Z ZZ] Z ZZ'),
              boundaries: [
                '2026-12-31T14:59:59Z', '2026-12-31T15:00:00Z',
                '2026-03-08T09:59:59Z', '2026-03-08T10:00:00Z',
                '2026-11-01T08:59:59Z', '2026-11-01T09:00:00Z',
                '2026-03-07T17:30:00Z', '2026-03-07T18:30:00Z',
                '2026-10-31T16:30:00Z',
              ].map(value => formatAsKst(value, 'YYYY-MM-DD HH:mm:ss')),
              fallbacks: [null, undefined, '', 'not-a-date', new Date(NaN)]
                .map(value => formatAsKst(value, 'YYYY-MM-DD HH:mm:ss')),
              duration: parseAsUtc('2026-03-08T03:00:30-07:00')
                .diff(parseAsUtc('2026-03-08T01:59:00-08:00'), 'second'),
            }));
          `,
        ],
        { encoding: 'utf8', env: { ...process.env, TZ: timezone } }
      )
    );

    expect(result).toEqual({
      epochs: Array(5).fill(1792758896000),
      dates: Array(5).fill('2026-10-23 21:34:56'),
      short: '26-10-23 21:34:56',
      offset: '2026-10-23T21:34:56+09:00',
      offsetLiterals: 'Z ZZ +09:00 +0900',
      boundaries: [
        '2026-12-31 23:59:59',
        '2027-01-01 00:00:00',
        '2026-03-08 18:59:59',
        '2026-03-08 19:00:00',
        '2026-11-01 17:59:59',
        '2026-11-01 18:00:00',
        '2026-03-08 02:30:00',
        '2026-03-08 03:30:00',
        '2026-11-01 01:30:00',
      ],
      fallbacks: [null, null, null, null, null],
      duration: 90,
    });
  });
});

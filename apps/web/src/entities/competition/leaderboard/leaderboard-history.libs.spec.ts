import { describe, expect, it } from 'vitest';
import type { LeaderboardHistory } from '@stock/contracts';
import { toHistoryLines } from './leaderboard-history.libs';

/**
 * 이력 → 라인차트 곡선 변환 계약:
 *  - 각 점을 [timestampMs, totalValue] 로 바꾼다(시간축에 그대로 넣는다).
 *  - 점이 없는 참가자는 곡선에서 제외한다.
 *  - meId 와 같은 참가자만 highlighted 다.
 */
const history = (series: LeaderboardHistory['series']): LeaderboardHistory => ({
  seasonId: 's1',
  series,
  at: '2026-08-26T00:10:00.000Z',
});

describe('toHistoryLines', () => {
  it('점을 [ms, 값] 으로 바꾸고 내 곡선을 강조한다', () => {
    const lines = toHistoryLines(
      history([
        {
          participantId: 'p1',
          nickname: '철수',
          points: [
            { at: '2026-08-26T00:00:00.000Z', totalValue: 1_000_000, totalProfitLossRate: 0 },
            { at: '2026-08-26T00:05:00.000Z', totalValue: 1_050_000, totalProfitLossRate: 5 },
          ],
        },
      ]),
      'p1',
    );

    expect(lines).toHaveLength(1);
    expect(lines[0]?.highlighted).toBe(true);
    expect(lines[0]?.points).toEqual([
      [Date.parse('2026-08-26T00:00:00.000Z'), 1_000_000],
      [Date.parse('2026-08-26T00:05:00.000Z'), 1_050_000],
    ]);
  });

  it('점이 없는 참가자는 곡선에서 제외한다', () => {
    const lines = toHistoryLines(
      history([{ participantId: 'p2', nickname: '영희', points: [] }]),
      null,
    );
    expect(lines).toEqual([]);
  });

  it('meId 가 없으면 아무 곡선도 강조하지 않는다', () => {
    const lines = toHistoryLines(
      history([
        {
          participantId: 'p1',
          nickname: '철수',
          points: [{ at: '2026-08-26T00:00:00.000Z', totalValue: 1_000_000, totalProfitLossRate: 0 }],
        },
      ]),
    );
    expect(lines[0]?.highlighted).toBe(false);
  });
});

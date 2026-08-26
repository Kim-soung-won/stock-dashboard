import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { LeaderboardService } from './leaderboard.service';
import type { SeasonService } from './season.service';

/**
 * 이력(getHistory) 계약을 고정한다:
 *  - 스냅샷을 참가자별 시계열로 묶고, 각 시리즈는 오래된→최신 순으로 점을 쌓는다.
 *  - 닉네임은 포트폴리오에서 채우고, 없으면 participantId 로 대체한다.
 * 순위 계산·브로드캐스트(WS·틱)는 이 테스트 범위 밖이라 목으로 대체한다.
 */
const seasonRow = { id: 's1', startingCash: 1_000_000, startAt: new Date(), endAt: new Date() };

const snap = (participantId: string, at: string, totalValue: number, rate: number) => ({
  id: `${participantId}-${at}`,
  seasonId: 's1',
  participantId,
  totalValue,
  totalProfitLossRate: rate,
  createdAt: new Date(at),
});

const makeService = (snapshots: unknown[], portfolios: unknown[]) => {
  const prisma = {
    portfolioSnapshot: { findMany: vi.fn().mockResolvedValue(snapshots) },
    portfolio: { findMany: vi.fn().mockResolvedValue(portfolios) },
  } as unknown as PrismaService;
  const season = { getActiveSeasonRow: vi.fn().mockResolvedValue(seasonRow) } as unknown as SeasonService;
  // 생성자의 나머지 의존성은 getHistory 에서 쓰이지 않으므로 빈 객체로 둔다.
  const service = new LeaderboardService(
    prisma,
    season,
    {} as never,
    {} as never,
    { on: vi.fn() } as never,
  );
  return { service, prisma };
};

describe('LeaderboardService.getHistory', () => {
  let snapshots: unknown[];
  beforeEach(() => {
    snapshots = [
      snap('p1', '2026-08-26T00:00:00.000Z', 1_000_000, 0),
      snap('p2', '2026-08-26T00:00:00.000Z', 1_000_000, 0),
      snap('p1', '2026-08-26T00:05:00.000Z', 1_050_000, 5),
      snap('p2', '2026-08-26T00:05:00.000Z', 980_000, -2),
    ];
  });

  it('참가자별 시계열로 묶고 각 점의 값을 보존한다', async () => {
    const { service } = makeService(snapshots, [
      { participantId: 'p1', participant: { nickname: '철수' } },
      { participantId: 'p2', participant: { nickname: '영희' } },
    ]);

    const history = await service.getHistory();

    expect(history.series).toHaveLength(2);
    const p1 = history.series.find((s) => s.participantId === 'p1');
    expect(p1?.nickname).toBe('철수');
    expect(p1?.points.map((point) => point.totalValue)).toEqual([1_000_000, 1_050_000]);
    expect(p1?.points[1]?.totalProfitLossRate).toBe(5);
  });

  it('닉네임이 없으면 participantId 로 대체한다', async () => {
    const { service } = makeService(
      [snap('p9', '2026-08-26T00:00:00.000Z', 1_000_000, 0)],
      [], // 포트폴리오 매핑 없음
    );
    const history = await service.getHistory();
    expect(history.series[0]?.nickname).toBe('p9');
  });

  it('스냅샷이 없으면 빈 시리즈다', async () => {
    const { service } = makeService([], []);
    const history = await service.getHistory();
    expect(history.series).toEqual([]);
    expect(history.seasonId).toBe('s1');
  });
});

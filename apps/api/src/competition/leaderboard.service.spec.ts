import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { buildDailyHistory, LeaderboardService } from './leaderboard.service';
import type { SeasonService } from './season.service';

/**
 * 추이(getHistory / buildDailyHistory) 계약을 고정한다:
 *  - **고정 30일 축**: 데이터가 하루치뿐이어도 참가자마다 windowDays 개의 점을 갖는다.
 *  - **시드 백필**: 데이터 없는 앞 구간·늦게 들어온 참가자는 시드(100만·0%)로 채운다(0 이 아니다).
 *  - **빈 날 이월**: 중간에 빠진 날은 직전 값을 이월(carry-forward)한다.
 *  - **종가**: 같은 거래일에 여러 점이면 마지막(종가)만 남긴다.
 *  - 닉네임은 포트폴리오에서 채우고, 없으면 participantId 로 대체한다.
 * 순위 계산·브로드캐스트(WS·틱)는 이 테스트 범위 밖이라 목으로 대체한다.
 */
const SEED = 1_000_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const seasonRow = { id: 's1', startingCash: SEED, startAt: new Date(), endAt: new Date() };

const snap = (participantId: string, at: string | Date, totalValue: number, rate: number) => ({
  id: `${participantId}-${String(at)}`,
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

const names = (entries: [string, string][]) => new Map(entries);

// 15:30 KST = 06:30Z. 날짜만 바꿔 서로 다른 거래일을 만든다. 오늘=dayC 로 가정한다.
const dayA = '2026-08-25T06:30:00.000Z';
const dayB = '2026-08-26T06:30:00.000Z';
const dayC = '2026-08-27T06:30:00.000Z';
const nowC = new Date(dayC).getTime();

describe('LeaderboardService.getHistory', () => {
  // 30일 창 밖으로 밀려나 깨지지 않도록 스냅샷을 '지금' 기준 상대일로 둔다.
  const nowMs = Date.now();
  const iso = (offsetDays: number) => new Date(nowMs - offsetDays * DAY_MS).toISOString();
  let snapshots: unknown[];
  beforeEach(() => {
    snapshots = [
      snap('p1', iso(1), 1_000_000, 0), // 어제
      snap('p2', iso(1), 1_000_000, 0),
      snap('p1', iso(0), 1_050_000, 5), // 오늘
      snap('p2', iso(0), 980_000, -2),
    ];
  });

  it('참가자별로 고정 30일(windowDays) 길이의 시계열을 만들고 최신 값을 보존한다', async () => {
    const { service } = makeService(snapshots, [
      { participantId: 'p1', participant: { nickname: '철수' } },
      { participantId: 'p2', participant: { nickname: '영희' } },
    ]);

    const history = await service.getHistory();

    expect(history.series).toHaveLength(2);
    const p1 = history.series.find((s) => s.participantId === 'p1');
    expect(p1?.nickname).toBe('철수');
    expect(p1?.points).toHaveLength(30); // HISTORY_WINDOW_DAYS
    expect(p1?.points[0]?.totalValue).toBe(SEED); // 데이터 없는 앞 구간은 시드
    expect(p1?.points.at(-1)?.totalValue).toBe(1_050_000); // 오늘(최신)
    expect(p1?.points.at(-1)?.totalProfitLossRate).toBe(5);
  });

  it('닉네임이 없으면 participantId 로 대체한다', async () => {
    const { service } = makeService([snap('p9', iso(0), 1_000_000, 0)], []);
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

describe('buildDailyHistory (고정 창 windowDays=3, 오늘=08-27)', () => {
  it('데이터가 하루치뿐이어도 windowDays 만큼 점을 만들고 앞 구간을 시드로 채운다', () => {
    // p1 은 오늘(dayC)만 있다. 앞 이틀(dayA·dayB)은 시드로 채워 3점이 된다 → 곡선이 바로 그려진다.
    const series = buildDailyHistory([snap('p1', dayC, 1_005_000, 0.5)], names([['p1', '철수']]), nowC, 3);
    const p1 = series[0];
    expect(p1?.points).toHaveLength(3);
    expect(p1?.points[0]).toMatchObject({ totalValue: SEED, totalProfitLossRate: 0 });
    expect(p1?.points[1]).toMatchObject({ totalValue: SEED, totalProfitLossRate: 0 });
    expect(p1?.points[2]).toMatchObject({ totalValue: 1_005_000, totalProfitLossRate: 0.5 });
  });

  it('늦게 들어온 참가자도 같은 길이(시드 백필)로 정렬된다', () => {
    // p3 는 dayC 에 처음 등장 — p1 과 같은 3점, 앞은 시드.
    const series = buildDailyHistory(
      [snap('p1', dayA, 1_000_000, 0), snap('p1', dayC, 1_050_000, 5), snap('p3', dayC, 1_200_000, 20)],
      names([['p1', '철수'], ['p3', '민수']]),
      nowC,
      3,
    );
    const p3 = series.find((s) => s.participantId === 'p3');
    expect(p3?.points).toHaveLength(3);
    expect(p3?.points[0]).toMatchObject({ totalValue: SEED, totalProfitLossRate: 0 });
    expect(p3?.points[1]).toMatchObject({ totalValue: SEED, totalProfitLossRate: 0 });
    expect(p3?.points[2]).toMatchObject({ totalValue: 1_200_000, totalProfitLossRate: 20 });
  });

  it('같은 칸의 대표 시각은 모든 곡선이 공유한다(세로 정렬)', () => {
    const series = buildDailyHistory(
      [snap('p1', dayA, 1_000_000, 0), snap('p3', dayC, 1_200_000, 20)],
      names([]),
      nowC,
      3,
    );
    const p1 = series.find((s) => s.participantId === 'p1');
    const p3 = series.find((s) => s.participantId === 'p3');
    // dayA 칸: p1 은 실제, p3 은 백필 — at 이 같아야 한다.
    expect(p3?.points[0]?.at).toBe(p1?.points[0]?.at);
    // dayA 칸의 at 은 실제 스냅샷 시각(dayA)이다.
    expect(p1?.points[0]?.at).toBe(new Date(dayA).toISOString());
  });

  it('중간에 빠진 날은 직전 값을 이월한다', () => {
    // p1 은 dayA, dayC 만(dayB 없음). dayB 칸은 dayA 값을 잇는다.
    const series = buildDailyHistory(
      [snap('p1', dayA, 1_000_000, 0), snap('p1', dayC, 1_100_000, 10)],
      names([]),
      nowC,
      3,
    );
    const p1 = series[0];
    expect(p1?.points.map((point) => point.totalValue)).toEqual([1_000_000, 1_000_000, 1_100_000]);
  });

  it('같은 거래일에 여러 점이 있으면 마지막(종가)만 남긴다', () => {
    const series = buildDailyHistory(
      [
        snap('p1', '2026-08-27T06:00:00.000Z', 1_000_000, 0),
        snap('p1', '2026-08-27T06:30:00.000Z', 1_030_000, 3),
      ],
      names([]),
      nowC,
      1,
    );
    const p1 = series[0];
    expect(p1?.points).toHaveLength(1);
    expect(p1?.points[0]).toMatchObject({ totalValue: 1_030_000, totalProfitLossRate: 3 });
  });

  it('스냅샷이 하나도 없으면 빈 배열이다', () => {
    expect(buildDailyHistory([], names([]), nowC, 30)).toEqual([]);
  });
});

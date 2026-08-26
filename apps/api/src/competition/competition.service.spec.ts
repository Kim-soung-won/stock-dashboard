import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { TradeRequest } from '@stock/contracts';
import type { MarketService } from '../market/market.service';
import type { PrismaService } from '../prisma/prisma.service';
import { BUY_FEE_RATE, feeOf, SELL_FEE_RATE, SELL_TAX_RATE } from './competition.constants';
import { CompetitionService } from './competition.service';
import type { LeaderboardService } from './leaderboard.service';
import type { PricebookService } from './pricebook.service';
import type { SeasonService } from './season.service';

/**
 * 페이퍼 체결 엔진의 계약을 고정한다 — **돈 계산과 가드**.
 *  - 체결가는 서버 시세(getQuote)로만 정한다. 현재가 없으면 거부.
 *  - 매수는 수수료를 더한 비용이 현금을 넘으면 거부, 매도는 보유 부족이면 거부.
 *  - 매도는 수수료+거래세를 떼고, 순현금(cashDelta)/현금 증감이 정확해야 한다.
 *  - 시즌 창 밖이면 시세 조회 전에 거부한다.
 * DB 트랜잭션은 콜백을 즉시 실행하는 목으로 대체한다(실 DB 없음).
 */
const participant = {
  id: 'p1',
  nickname: '철수',
  pinHash: 'x',
  bio: null,
  avatarEmoji: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
} as never;

const seasonRow = {
  id: 's1',
  startingCash: 1_000_000,
  startAt: new Date('2026-08-01'),
  endAt: new Date('2026-12-31'),
} as never;

const quote = (price: number | null) => ({
  code: '005930',
  name: '삼성전자',
  price,
  direction: 'flat' as const,
  change: null,
  changeRate: null,
  open: null,
  high: null,
  low: null,
  volume: null,
  tradeValue: null,
  at: '2026-08-26T00:00:00.000Z',
});

const makeCtx = (opts: { cash?: number; holding?: unknown; price?: number | null } = {}) => {
  const portfolioRow = {
    id: 'pf1',
    participantId: 'p1',
    seasonId: 's1',
    startingCash: 1_000_000,
    cash: opts.cash ?? 1_000_000,
  };
  const tx = {
    holding: {
      findUnique: vi.fn().mockResolvedValue(opts.holding ?? null),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    portfolio: { update: vi.fn().mockResolvedValue({}) },
    paperTrade: {
      create: vi.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 't1', createdAt: new Date('2026-08-26T00:00:00.000Z'), ...data }),
      ),
    },
  };
  const prisma = {
    portfolio: {
      findUnique: vi.fn().mockResolvedValue(portfolioRow),
      findUniqueOrThrow: vi.fn().mockResolvedValue(portfolioRow),
    },
    holding: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  // 'price' 키가 있으면(=null 포함) 그대로 쓰고, 없을 때만 기본가로 채운다.
  const resolvedPrice = 'price' in opts ? (opts.price ?? null) : 50_000;
  const market = { getQuote: vi.fn().mockResolvedValue(quote(resolvedPrice)) } as unknown as MarketService;
  const season = {
    getActiveSeasonRow: vi.fn().mockResolvedValue(seasonRow),
    assertTradable: vi.fn(),
  } as unknown as SeasonService;
  const pricebook = { getPrice: vi.fn().mockReturnValue(null) } as unknown as PricebookService;
  const leaderboard = { onPortfolioChanged: vi.fn().mockResolvedValue(undefined) } as unknown as LeaderboardService;

  return {
    tx,
    prisma,
    market,
    season,
    leaderboard,
    service: new CompetitionService(prisma, market, season, pricebook, leaderboard),
  };
};

const buy = (quantity: number): TradeRequest => ({ code: '005930', side: 'buy', quantity });
const sell = (quantity: number): TradeRequest => ({ code: '005930', side: 'sell', quantity });

describe('CompetitionService.trade — 매수', () => {
  it('거래대금+수수료만큼 현금을 줄이고 평균가를 세운다', async () => {
    const { service, tx } = makeCtx({ cash: 1_000_000, price: 50_000 });
    const amount = 50_000 * 2;
    const fee = feeOf(amount, BUY_FEE_RATE); // 절사(floor) — 요율은 상수에서 온다
    const cost = amount + fee;

    const result = await service.trade(participant, buy(2));

    expect(tx.paperTrade.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ side: 'buy', quantity: 2, price: 50_000, fee, tax: 0, cashDelta: -cost }),
    });
    expect(tx.portfolio.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cash: { decrement: cost } } }),
    );
    expect(tx.holding.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ quantity: 2, averagePrice: 50_000 }) }),
    );
    expect(result.trade.cashDelta).toBe(-cost);
  });

  it('현금이 부족하면 거부하고 체결을 남기지 않는다', async () => {
    const { service, tx } = makeCtx({ cash: 100, price: 50_000 });
    await expect(service.trade(participant, buy(2))).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.paperTrade.create).not.toHaveBeenCalled();
  });
});

describe('CompetitionService.trade — 매도', () => {
  it('수수료+거래세를 떼고 순현금을 더한다', async () => {
    const holding = { id: 'h1', portfolioId: 'pf1', code: '005930', name: '삼성전자', quantity: 10, averagePrice: 40_000 };
    const { service, tx } = makeCtx({ holding, price: 50_000 });
    const amount = 50_000 * 4;
    const fee = feeOf(amount, SELL_FEE_RATE);
    const tax = feeOf(amount, SELL_TAX_RATE); // 거래세는 매도에만
    const proceeds = amount - fee - tax;

    await service.trade(participant, sell(4));

    expect(tx.paperTrade.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ side: 'sell', fee, tax, cashDelta: proceeds }),
    });
    expect(tx.portfolio.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cash: { increment: proceeds } } }),
    );
    expect(tx.holding.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 6 } }),
    );
  });

  it('보유 수량이 부족하면 거부한다', async () => {
    const holding = { id: 'h1', quantity: 2, averagePrice: 40_000, name: '삼성전자' };
    const { service, tx } = makeCtx({ holding, price: 50_000 });
    await expect(service.trade(participant, sell(4))).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.paperTrade.create).not.toHaveBeenCalled();
  });
});

describe('CompetitionService.trade — 가드', () => {
  it('현재가를 확인할 수 없으면 체결하지 않는다', async () => {
    const { service } = makeCtx({ price: null });
    await expect(service.trade(participant, buy(1))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('시즌 창 밖이면 시세 조회 전에 거부한다', async () => {
    const { service, market, season } = makeCtx();
    vi.mocked(season.assertTradable).mockImplementation(() => {
      throw new BadRequestException('시즌 종료');
    });
    await expect(service.trade(participant, buy(1))).rejects.toBeInstanceOf(BadRequestException);
    expect(market.getQuote).not.toHaveBeenCalled();
  });
});

/**
 * 신규 참가자의 **첫 로그인**은 포트폴리오·체결이력·리더보드 조회가 한꺼번에 들어오는
 * 자리다. 여기서 "읽어보고 없으면 만든다"가 겹치면 늦은 쪽이 유니크 위반으로 500 을
 * 받는다 — 그 상황에서도 조회가 성공해야 한다는 계약을 고정한다.
 */
describe('CompetitionService.getPortfolio — 포트폴리오 최초 생성', () => {
  const portfolioRow = {
    id: 'pf1',
    participantId: 'p1',
    seasonId: 's1',
    startingCash: 1_000_000,
    cash: 1_000_000,
  };

  /** findUnique 가 순서대로 돌려줄 값과 create 의 동작을 지정해 경쟁 상태를 재현한다. */
  const makeBootstrapCtx = (opts: {
    findUniqueSequence: unknown[];
    create: () => Promise<unknown>;
  }) => {
    const findUnique = vi.fn();
    opts.findUniqueSequence.forEach((value) => findUnique.mockResolvedValueOnce(value));
    const create = vi.fn(opts.create);
    const prisma = {
      portfolio: { findUnique, create },
      holding: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const season = {
      getActiveSeasonRow: vi.fn().mockResolvedValue(seasonRow),
      assertTradable: vi.fn(),
    } as unknown as SeasonService;
    const leaderboard = {
      onPortfolioChanged: vi.fn().mockResolvedValue(undefined),
    } as unknown as LeaderboardService;
    const market = { getQuote: vi.fn() } as unknown as MarketService;
    const pricebook = { getPrice: vi.fn().mockReturnValue(null) } as unknown as PricebookService;
    return {
      create,
      findUnique,
      leaderboard,
      service: new CompetitionService(prisma, market, season, pricebook, leaderboard),
    };
  };

  /** 유니크 위반은 Prisma 런타임 없이 코드만으로 재현한다. */
  const uniqueViolation = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

  it('없으면 시드머니로 만들고 순위를 다시 밀어준다', async () => {
    const ctx = makeBootstrapCtx({
      findUniqueSequence: [null],
      create: () => Promise.resolve(portfolioRow),
    });

    const result = await ctx.service.getPortfolio(participant);

    expect(ctx.create).toHaveBeenCalledWith({
      data: { participantId: 'p1', seasonId: 's1', startingCash: 1_000_000, cash: 1_000_000 },
    });
    expect(ctx.leaderboard.onPortfolioChanged).toHaveBeenCalledTimes(1);
    expect(result.cash).toBe(1_000_000);
  });

  it('동시 요청이 먼저 만들었으면(P2002) 실패하지 않고 그 포트폴리오를 쓴다', async () => {
    const raced = { ...portfolioRow, cash: 900_000 };
    const ctx = makeBootstrapCtx({
      findUniqueSequence: [null, raced],
      create: () => Promise.reject(uniqueViolation),
    });

    const result = await ctx.service.getPortfolio(participant);

    // 먼저 만들어진 쪽의 현금이 보여야 한다 — 시드머니로 되돌리면 돈을 지운다.
    expect(result.cash).toBe(900_000);
  });

  it('경쟁에서 진 쪽은 순위를 다시 밀지 않는다(이긴 쪽이 이미 밀었다)', async () => {
    const ctx = makeBootstrapCtx({
      findUniqueSequence: [null, portfolioRow],
      create: () => Promise.reject(uniqueViolation),
    });

    await ctx.service.getPortfolio(participant);

    expect(ctx.leaderboard.onPortfolioChanged).not.toHaveBeenCalled();
  });

  it('유니크 위반이 아닌 에러는 삼키지 않는다', async () => {
    const ctx = makeBootstrapCtx({
      findUniqueSequence: [null],
      create: () => Promise.reject(new Error('연결 끊김')),
    });

    await expect(ctx.service.getPortfolio(participant)).rejects.toThrow('연결 끊김');
  });

  it('위반이 났는데 행도 없으면 그대로 올린다(다른 제약을 삼키지 않는다)', async () => {
    const ctx = makeBootstrapCtx({
      findUniqueSequence: [null, null],
      create: () => Promise.reject(uniqueViolation),
    });

    await expect(ctx.service.getPortfolio(participant)).rejects.toThrow('Unique constraint failed');
  });
});

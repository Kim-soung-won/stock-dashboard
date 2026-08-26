import type { Holding as HoldingRow } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { BUY_FEE_RATE, feeOf, normalizeCode, SELL_TAX_RATE } from './competition.constants';
import { buildPortfolio, evaluateTotals, toHolding } from './competition.mapper';

/** 테스트용 보유 행 — 매퍼가 쓰는 필드만 채우고 나머지는 형식만 맞춘다. */
const holding = (partial: Partial<HoldingRow>): HoldingRow => ({
  id: 'h1',
  portfolioId: 'p1',
  code: '005930',
  name: '삼성전자',
  quantity: 10,
  averagePrice: 50_000,
  updatedAt: new Date(0),
  ...partial,
});

describe('competition.constants', () => {
  it('수수료·세금은 거래대금에 요율을 곱해 절사한다', () => {
    // 1,000,000원 매수 → 0.015% = 150원
    expect(feeOf(1_000_000, BUY_FEE_RATE)).toBe(150);
    // 999,999원 매도세 0.15% = 1499.9985 → 절사 1499
    expect(feeOf(999_999, SELL_TAX_RATE)).toBe(1499);
  });

  it('종목코드는 거래소 접미사를 떼어 정규화한다', () => {
    expect(normalizeCode(' 005930_AL ')).toBe('005930');
    expect(normalizeCode('005930')).toBe('005930');
  });
});

describe('toHolding', () => {
  it('현재가가 있으면 평가·손익·수익률을 계산한다', () => {
    const result = toHolding(holding({ quantity: 10, averagePrice: 50_000 }), () => 55_000);
    expect(result.currentPrice).toBe(55_000);
    expect(result.evaluationAmount).toBe(550_000);
    expect(result.profitLoss).toBe(50_000);
    expect(result.profitLossRate).toBe(10);
  });

  it('현재가가 없으면 평가값은 모두 null 이다(값 0 과 구분)', () => {
    const result = toHolding(holding({}), () => null);
    expect(result.currentPrice).toBeNull();
    expect(result.evaluationAmount).toBeNull();
    expect(result.profitLoss).toBeNull();
    expect(result.profitLossRate).toBeNull();
  });
});

describe('evaluateTotals', () => {
  it('현금 + 보유평가로 총평가·수익률을 낸다', () => {
    const totals = evaluateTotals(
      1_000_000,
      500_000,
      [holding({ quantity: 10, averagePrice: 50_000 })],
      () => 55_000,
    );
    expect(totals.totalValue).toBe(1_050_000); // 현금 50만 + 보유 55만
    expect(totals.totalProfitLoss).toBe(50_000);
    expect(totals.totalProfitLossRate).toBe(5);
  });

  it('시세가 없는 보유는 매입가로 대체 평가해 총액이 흔들리지 않는다', () => {
    const totals = evaluateTotals(
      1_000_000,
      500_000,
      [holding({ quantity: 10, averagePrice: 50_000 })],
      () => null,
    );
    // 보유는 매입가(50만)로 평가 → 총 100만, 손익 0
    expect(totals.totalValue).toBe(1_000_000);
    expect(totals.totalProfitLoss).toBe(0);
    expect(totals.totalProfitLossRate).toBe(0);
  });
});

describe('buildPortfolio', () => {
  it('참가자·시즌·보유를 하나의 포트폴리오로 조립한다', () => {
    const portfolio = buildPortfolio({
      seasonId: 's1',
      participant: {
        id: 'u1',
        nickname: '철수',
        createdAt: '2026-01-01T00:00:00.000Z',
        bio: null,
        avatarEmoji: null,
      },
      startingCash: 1_000_000,
      cash: 500_000,
      holdings: [holding({ quantity: 10, averagePrice: 50_000 })],
      getPrice: () => 60_000,
      now: '2026-08-26T00:00:00.000Z',
    });
    expect(portfolio.totalValue).toBe(1_100_000); // 현금 50만 + 보유 60만
    expect(portfolio.totalProfitLossRate).toBe(10);
    expect(portfolio.holdings).toHaveLength(1);
    expect(portfolio.holdings[0]?.profitLoss).toBe(100_000);
  });
});

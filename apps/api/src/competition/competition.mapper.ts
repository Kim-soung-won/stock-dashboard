import type { Holding as HoldingRow, PaperTrade as TradeRow } from '@prisma/client';
import type {
  Holding,
  PaperTrade,
  Participant,
  Portfolio,
} from '@stock/contracts';

/** 코드 → 현재가(원) 조회 함수. pricebook 을 주입해 매퍼를 순수하게 유지한다. */
export type PriceLookup = (code: string) => number | null;

/** 보유 1건을 현재가로 평가한다. 시세가 없으면 평가값들은 null. */
export const toHolding = (row: HoldingRow, getPrice: PriceLookup): Holding => {
  const currentPrice = getPrice(row.code);
  const evaluationAmount = currentPrice === null ? null : currentPrice * row.quantity;
  const profitLoss = currentPrice === null ? null : (currentPrice - row.averagePrice) * row.quantity;
  const profitLossRate =
    currentPrice === null || row.averagePrice <= 0
      ? null
      : round2(((currentPrice - row.averagePrice) / row.averagePrice) * 100);
  return {
    code: row.code,
    name: row.name,
    quantity: row.quantity,
    averagePrice: row.averagePrice,
    currentPrice,
    evaluationAmount,
    profitLoss,
    profitLossRate,
  };
};

interface Totals {
  totalValue: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
}

/**
 * 총평가 계산. 시세가 아직 없는 보유는 매입가로 대체 평가해 총액이 과소평가되지
 * 않게 한다(랭킹이 시세 도착 순서에 흔들리지 않도록).
 */
export const evaluateTotals = (
  startingCash: number,
  cash: number,
  holdings: HoldingRow[],
  getPrice: PriceLookup,
): Totals => {
  let holdingsValue = 0;
  for (const holding of holdings) {
    const price = getPrice(holding.code) ?? holding.averagePrice;
    holdingsValue += price * holding.quantity;
  }
  const totalValue = cash + holdingsValue;
  const totalProfitLoss = totalValue - startingCash;
  const totalProfitLossRate =
    startingCash > 0 ? round2((totalProfitLoss / startingCash) * 100) : 0;
  return { totalValue, totalProfitLoss, totalProfitLossRate };
};

/** 포트폴리오 전체 조립(내 상세 화면용). */
export const buildPortfolio = (params: {
  seasonId: string;
  participant: Participant;
  startingCash: number;
  cash: number;
  holdings: HoldingRow[];
  getPrice: PriceLookup;
  now: string;
}): Portfolio => {
  const totals = evaluateTotals(params.startingCash, params.cash, params.holdings, params.getPrice);
  return {
    seasonId: params.seasonId,
    participant: params.participant,
    startingCash: params.startingCash,
    cash: params.cash,
    ...totals,
    holdings: params.holdings.map((holding) => toHolding(holding, params.getPrice)),
    at: params.now,
  };
};

export const toPaperTrade = (row: TradeRow): PaperTrade => ({
  id: row.id,
  code: row.code,
  name: row.name,
  side: row.side as PaperTrade['side'],
  quantity: row.quantity,
  price: row.price,
  amount: row.price * row.quantity,
  fee: row.fee,
  tax: row.tax,
  cashDelta: row.cashDelta,
  at: row.createdAt.toISOString(),
});

const round2 = (value: number): number => Math.round(value * 100) / 100;

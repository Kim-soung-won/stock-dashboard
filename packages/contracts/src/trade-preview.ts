import type { OrderSide } from './account';

/**
 * 체결이 예수금에 주는 영향 계산 (순수).
 *
 * **BFF 와 웹이 같은 식을 써야 한다.** 서버는 이 식으로 실제 현금을 옮기고, 화면은 같은
 * 식으로 "체결하면 예수금이 이렇게 됩니다"를 미리 보여준다. 식이 두 벌이면 확인 창에
 * 적힌 금액과 실제 차감액이 달라진다 — 돈 화면에서 가장 하면 안 되는 일이다.
 *
 * 계산은 전부 원(정수)이고 수수료·세금은 **절사(floor)** 한다.
 */

/** 매수 수수료율 (거래대금 대비). */
export const BUY_FEE_RATE = 0.00015;

/** 매도 수수료율 (거래대금 대비). */
export const SELL_FEE_RATE = 0.00015;

/** 거래세율 — 매도에만 부과 (2025년 기준 0.15%). */
export const SELL_TAX_RATE = 0.0015;

/** 거래대금에 대한 수수료(원, 절사). */
export const feeOf = (amount: number, rate: number): number => Math.floor(amount * rate);

export interface TradePreviewInput {
  side: OrderSide;
  /** 예상 체결 단가(원). 실제 체결가는 서버가 관측한 시세로 정해진다. */
  price: number;
  quantity: number;
  /** 현재 예수금(원) */
  cash: number;
  /** 이 종목의 보유수량(주). 매도 가능 여부 판정에 쓴다. */
  holdingQuantity: number;
}

export interface TradePreview {
  /** 거래대금(원) = 단가 × 수량 */
  amount: number;
  /** 매매수수료(원) */
  fee: number;
  /** 거래세(원). 매도에만 붙는다 */
  tax: number;
  /** 이 체결로 오가는 순현금(원). 매수는 음수, 매도는 양수 */
  cashDelta: number;
  /** 체결 전 예수금(원) */
  cashBefore: number;
  /** 체결 후 예수금(원) */
  cashAfter: number;
  /**
   * 지금 이대로 요청하면 서버가 거부할 사유. 없으면 null.
   * 화면은 이걸로 확인 버튼을 잠그고, 최종 판정은 서버가 다시 한다.
   */
  blockedReason: string | null;
}

/**
 * 체결 예상치. 서버의 executeTrade 와 같은 순서로 계산한다:
 * 매수는 거래대금+수수료를 현금에서 빼고, 매도는 거래대금에서 수수료·세금을 뗀 뒤 더한다.
 */
export const previewTrade = ({
  side,
  price,
  quantity,
  cash,
  holdingQuantity,
}: TradePreviewInput): TradePreview => {
  const amount = price * quantity;

  if (side === 'buy') {
    const fee = feeOf(amount, BUY_FEE_RATE);
    const cost = amount + fee;
    return {
      amount,
      fee,
      tax: 0,
      cashDelta: -cost,
      cashBefore: cash,
      cashAfter: cash - cost,
      blockedReason:
        cash < cost
          ? `예수금이 부족합니다 (필요 ${cost.toLocaleString('ko-KR')}원 / 보유 ${cash.toLocaleString('ko-KR')}원)`
          : null,
    };
  }

  const fee = feeOf(amount, SELL_FEE_RATE);
  const tax = feeOf(amount, SELL_TAX_RATE);
  const proceeds = amount - fee - tax;
  return {
    amount,
    fee,
    tax,
    cashDelta: proceeds,
    cashBefore: cash,
    cashAfter: cash + proceeds,
    blockedReason:
      holdingQuantity < quantity
        ? `보유 수량이 부족합니다 (보유 ${holdingQuantity.toLocaleString('ko-KR')}주)`
        : null,
  };
};

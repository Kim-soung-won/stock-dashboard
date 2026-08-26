import { describe, expect, it } from 'vitest';
import { BUY_FEE_RATE, feeOf, previewTrade, SELL_FEE_RATE, SELL_TAX_RATE } from './trade-preview';

/**
 * 확인 창에 적힌 금액이 서버가 실제로 옮기는 금액과 **같아야 한다**. 이 식이 어긋나면
 * "안내는 99,900원인데 100,000원이 빠져나가는" 상태가 된다 — 돈 화면에서 가장 하면
 * 안 되는 일이다. 그래서 매수/매도의 부호와 절사까지 못 박는다.
 */
const input = {
  price: 50_000,
  quantity: 2,
  cash: 1_000_000,
  holdingQuantity: 10,
};

describe('previewTrade — 매수', () => {
  const preview = previewTrade({ ...input, side: 'buy' });

  it('거래대금은 단가 × 수량이다', () => {
    expect(preview.amount).toBe(100_000);
  });

  it('수수료를 더한 만큼 예수금이 줄어든다', () => {
    const fee = feeOf(100_000, BUY_FEE_RATE);
    expect(preview.fee).toBe(fee);
    expect(preview.cashDelta).toBe(-(100_000 + fee));
    expect(preview.cashAfter).toBe(1_000_000 - 100_000 - fee);
  });

  it('매수에는 거래세가 없다', () => {
    expect(preview.tax).toBe(0);
  });

  it('예수금이 모자라면 사유를 준다', () => {
    const poor = previewTrade({ ...input, side: 'buy', cash: 1_000 });
    expect(poor.blockedReason).toContain('예수금이 부족');
  });

  it('예수금이 충분하면 막지 않는다', () => {
    expect(preview.blockedReason).toBeNull();
  });

  it('수수료가 1원 미만이면 절사돼 0원이다', () => {
    // 1,000원 × 0.00015 = 0.15원 → 0원
    expect(previewTrade({ ...input, side: 'buy', price: 1_000, quantity: 1 }).fee).toBe(0);
  });
});

describe('previewTrade — 매도', () => {
  const preview = previewTrade({ ...input, side: 'sell' });

  it('수수료와 거래세를 뗀 만큼 예수금이 늘어난다', () => {
    const fee = feeOf(100_000, SELL_FEE_RATE);
    const tax = feeOf(100_000, SELL_TAX_RATE);
    expect(preview.cashDelta).toBe(100_000 - fee - tax);
    expect(preview.cashAfter).toBe(1_000_000 + 100_000 - fee - tax);
  });

  it('매도 순현금은 양수다(예수금이 늘어난다)', () => {
    expect(preview.cashDelta).toBeGreaterThan(0);
  });

  it('보유 수량이 모자라면 사유를 준다', () => {
    const short = previewTrade({ ...input, side: 'sell', quantity: 20, holdingQuantity: 3 });
    expect(short.blockedReason).toContain('보유 수량이 부족');
  });

  it('보유한 만큼 파는 것은 막지 않는다', () => {
    expect(previewTrade({ ...input, side: 'sell', quantity: 10 }).blockedReason).toBeNull();
  });
});

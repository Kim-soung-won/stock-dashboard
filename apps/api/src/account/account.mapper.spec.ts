import { describe, expect, it } from 'vitest';
import { toBalance, toOrderSide, toOrderStatus, toPendingOrders } from './account.mapper';

/**
 * 계좌 mapper 계약:
 *  - 평가손익·수익률은 부호 자체가 의미다(절대값 금지).
 *  - 주문상태 라벨 문자열 → 도메인 상태, 부분체결은 미체결 수량으로 판정한다.
 */
describe('toBalance', () => {
  it('요약·예수금·보유를 합치고 손익 부호를 유지한다', () => {
    const balance = toBalance(
      { tot_pur_amt: '1000000', tot_evlt_amt: '1100000', tot_evlt_pl: '-50000', tot_prft_rt: '-4.5' },
      { entr: '500000', ord_alow_amt: '480000' },
      [{ stk_cd: 'A005930', stk_nm: '삼성전자', rmnd_qty: '10', pur_pric: '50000', evltv_prft: '-12000', prft_rt: '-2.3' }],
    );
    expect(balance.totalProfitLoss).toBe(-50000);
    expect(balance.deposit).toBe(500000);
    expect(balance.positions).toHaveLength(1);
    expect(balance.positions[0]?.profitLoss).toBe(-12000);
    expect(balance.positions[0]?.quantity).toBe(10);
  });
});

describe('toOrderSide', () => {
  it('"매도"가 들어간 라벨만 sell, 나머지는 buy 다', () => {
    expect(toOrderSide('-매도정정')).toBe('sell');
    expect(toOrderSide('+매수')).toBe('buy');
    expect(toOrderSide(undefined)).toBe('buy');
  });
});

describe('toOrderStatus', () => {
  it('라벨 문자열을 도메인 상태로 매핑한다', () => {
    expect(toOrderStatus('거부')).toBe('rejected');
    expect(toOrderStatus('취소')).toBe('canceled');
    expect(toOrderStatus('체결')).toBe('filled');
    expect(toOrderStatus('접수')).toBe('accepted');
    expect(toOrderStatus('알수없음')).toBe('unknown');
  });
});

describe('toPendingOrders', () => {
  it('체결됐지만 미체결 수량이 남으면 부분체결로 본다', () => {
    const [order] = toPendingOrders([
      {
        ord_no: '123',
        orig_ord_no: '',
        stk_cd: 'A005930',
        stk_nm: '삼성전자',
        io_tp_nm: '+매수',
        ord_qty: '10',
        oso_qty: '4',
        ord_stt: '체결',
      },
    ]);
    expect(order?.status).toBe('partiallyFilled');
    expect(order?.side).toBe('buy');
    expect(order?.originalOrderNo).toBeNull();
    expect(order?.code).toBe('005930');
  });
});

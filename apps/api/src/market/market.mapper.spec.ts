import { describe, expect, it } from 'vitest';
import {
  toDailyCandles,
  toOrderBook,
  toQuote,
  toSymbols,
  toWonFromMillion,
} from './market.mapper';

/**
 * mapper 는 키움 스펙 함정을 흡수하는 유일한 지점이다. 이 계약을 고정한다:
 *  - 가격의 부호는 방향 표시라 **절대값**으로 읽는다(전일대비·등락률은 부호 유지).
 *  - 코드는 접두 A·거래소 접미사를 뗀다. 빈 문자열은 값 없음(null).
 *  - 백만원 단위 값은 원으로 환산한다. 봉은 과거→현재 순으로 정렬한다.
 */
describe('toQuote', () => {
  const row = {
    stk_cd: 'A005930',
    stk_nm: ' 삼성전자 ',
    cur_prc: '-20800', // 부호는 하락 방향 표시일 뿐, 값은 20800원
    pre_sig: '5', // 5 = 하락
    pred_pre: '-500',
    flu_rt: '-2.35',
    open_pric: '21000',
    trde_qty: '30000000',
  };

  it('가격은 절대값, 전일대비·등락률은 부호를 유지한다', () => {
    const quote = toQuote(row);
    expect(quote.price).toBe(20800);
    expect(quote.direction).toBe('down');
    expect(quote.change).toBe(-500);
    expect(quote.changeRate).toBe(-2.35);
  });

  it('코드는 정규화하고 이름은 트림한다', () => {
    const quote = toQuote(row);
    expect(quote.code).toBe('005930');
    expect(quote.name).toBe('삼성전자');
  });

  it('거래대금은 이 TR 에 없으므로 항상 null, 빈 값은 null 이다', () => {
    const quote = toQuote({ ...row, cur_prc: '' });
    expect(quote.price).toBeNull();
    expect(quote.tradeValue).toBeNull();
  });
});

describe('toDailyCandles', () => {
  it('과거→현재 순으로 정렬하고 날짜 없는 행은 버린다', () => {
    const candles = toDailyCandles([
      { dt: '20260826', cur_prc: '100' },
      { dt: '', cur_prc: '999' }, // 버려진다
      { dt: '20260824', cur_prc: '90' },
    ]);
    expect(candles.map((c) => c.at)).toEqual(['2026-08-24', '2026-08-26']);
    expect(candles[0]?.close).toBe(90);
  });
});

describe('toOrderBook', () => {
  it('1단계와 2단계의 서로 다른 필드명을 각각 읽고 10단계를 만든다', () => {
    const book = toOrderBook('A005930', {
      sel_fpr_bid: '20900',
      sel_fpr_req: '10',
      buy_fpr_bid: '20800',
      buy_fpr_req: '20',
      sel_2th_pre_bid: '21000',
      sel_2th_pre_req: '5',
      tot_sel_req: '1000',
      tot_buy_req: '2000',
    });
    expect(book.code).toBe('005930');
    expect(book.asks).toHaveLength(10);
    expect(book.bids).toHaveLength(10);
    expect(book.asks[0]).toEqual({ price: 20900, quantity: 10 });
    expect(book.asks[1]).toEqual({ price: 21000, quantity: 5 });
    expect(book.bids[0]).toEqual({ price: 20800, quantity: 20 });
    expect(book.totalAskQuantity).toBe(1000);
    expect(book.totalBidQuantity).toBe(2000);
  });
});

describe('toWonFromMillion', () => {
  it('백만원 단위를 원으로 환산하고 빈 값은 null 이다', () => {
    expect(toWonFromMillion('125')).toBe(125_000_000);
    expect(toWonFromMillion('')).toBeNull();
  });
});

describe('toSymbols', () => {
  it('코드/이름 없는 행은 버리고, 시장은 응답이 아니라 요청값을 유지한다', () => {
    const symbols = toSymbols(
      [
        { code: 'A005930', name: '삼성전자', marketName: 'KOSDAQ' },
        { code: '', name: '없음' }, // 버려진다
      ],
      'kospi',
    );
    expect(symbols).toEqual([{ code: '005930', name: '삼성전자', market: 'kospi' }]);
  });
});

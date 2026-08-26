import type { MarketKind } from '@stock/contracts';
import { describe, expect, it } from 'vitest';
import {
  marketCapOf,
  rankSymbolMatches,
  toDailyCandles,
  toMarketCapRanking,
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
    expect(symbols).toEqual([
      { code: '005930', name: '삼성전자', market: 'kospi', marketCap: null },
    ]);
  });

  it('상장주식수와 전일종가가 오면 시가총액을 파생한다', () => {
    const [symbol] = toSymbols(
      [{ code: 'A005930', name: '삼성전자', listCount: '0000000000000100', lastPrice: '00070000' }],
      'kospi',
    );
    expect(symbol?.marketCap).toBe(7_000_000);
  });
});

/**
 * 시가총액은 키움에 국내 순위 TR 이 없어 마스터에서 파생한다. 값이 없을 때 0 으로
 * 떨어지면 "시가총액 0원" 종목이 순위 맨 아래에 줄줄이 생긴다 — null 이어야 한다.
 */
describe('marketCapOf', () => {
  it('상장주식수 x 전일종가를 원 단위로 계산한다', () => {
    expect(marketCapOf({ listCount: '0000000000001000', lastPrice: '00050000' })).toBe(50_000_000);
  });

  it('상장주식수가 없으면 null 이다', () => {
    expect(marketCapOf({ lastPrice: '00050000' })).toBeNull();
  });

  it('전일종가가 없으면 null 이다', () => {
    expect(marketCapOf({ listCount: '0000000000001000' })).toBeNull();
  });

  it('어느 한쪽이 0 이면 null 이다 — 0원이 아니라 모르는 값이다', () => {
    expect(marketCapOf({ listCount: '0000000000000000', lastPrice: '00050000' })).toBeNull();
  });
});

/**
 * 시가총액 순위는 캐시에서 만든다. 가격이 **전일종가**라는 사실을 계약으로 고정한다 —
 * 전일대비·등락률을 0 으로 채우면 화면이 "보합"이라고 거짓말을 한다.
 */
describe('toMarketCapRanking', () => {
  const rows = [
    { code: '005930', name: '삼성전자', lastPrice: 70_000, marketCap: 400_000_000 },
    { code: '000660', name: 'SK하이닉스', lastPrice: 200_000, marketCap: 150_000_000 },
  ];

  it('받은 순서대로 1위부터 순위를 매긴다(정렬은 DB 가 한다)', () => {
    expect(toMarketCapRanking(rows).map((item) => item.rank)).toEqual([1, 2]);
  });

  it('가격은 전일종가이고 전일대비·등락률은 채우지 않는다', () => {
    const [first] = toMarketCapRanking(rows);
    expect(first?.price).toBe(70_000);
    expect(first?.change).toBeNull();
    expect(first?.changeRate).toBeNull();
    expect(first?.direction).toBe('flat');
  });

  it('시가총액을 그대로 싣는다', () => {
    expect(toMarketCapRanking(rows)[0]?.marketCap).toBe(400_000_000);
  });
});

/**
 * 이름으로 종목을 고르는 UX 의 계약: 사용자가 친 글자에 **가장 가까운 종목이 위**에
 * 오고, 같은 종목이 두 줄로 보이지 않는다.
 */
describe('rankSymbolMatches', () => {
  const symbol = (code: string, name: string, market: MarketKind = 'kospi') => ({
    code,
    name,
    market,
    marketCap: null,
  });

  it('이름 앞부분이 일치하는 종목을 중간에 포함된 종목보다 먼저 준다', () => {
    const result = rankSymbolMatches(
      [symbol('001', '대한삼성'), symbol('002', '삼성전자')],
      '삼성',
      10,
    );
    expect(result.map((item) => item.name)).toEqual(['삼성전자', '대한삼성']);
  });

  it('코드를 그대로 입력하면 그 종목이 1순위다', () => {
    const result = rankSymbolMatches(
      [symbol('005935', '삼성전자우'), symbol('005930', '삼성전자')],
      '005930',
      10,
    );
    expect(result[0]?.code).toBe('005930');
  });

  it('같은 관련도면 짧은 이름을 먼저 준다', () => {
    const result = rankSymbolMatches(
      [symbol('005935', '삼성전자우'), symbol('005930', '삼성전자')],
      '삼성전자',
      10,
    );
    expect(result.map((item) => item.name)).toEqual(['삼성전자', '삼성전자우']);
  });

  it('영문 종목명은 대소문자를 구분하지 않는다', () => {
    expect(rankSymbolMatches([symbol('001', 'KODEX 200')], 'kodex', 10)).toHaveLength(1);
  });

  it('여러 시장 목록에 걸친 같은 코드는 한 건으로 합친다', () => {
    const result = rankSymbolMatches(
      [symbol('069500', 'KODEX 200'), symbol('069500', 'KODEX 200', 'etf')],
      'KODEX',
      10,
    );
    expect(result).toHaveLength(1);
  });

  it('limit 을 넘겨 주지 않는다', () => {
    const many = Array.from({ length: 30 }, (_, index) =>
      symbol(String(index).padStart(6, '0'), `삼성${index}`),
    );
    expect(rankSymbolMatches(many, '삼성', 5)).toHaveLength(5);
  });

  it('어디에도 걸리지 않는 검색어는 빈 목록이다', () => {
    expect(rankSymbolMatches([symbol('005930', '삼성전자')], '없는종목', 10)).toEqual([]);
  });

  it('공백뿐인 검색어로는 전 종목을 퍼가지 못한다', () => {
    expect(rankSymbolMatches([symbol('005930', '삼성전자')], '   ', 10)).toEqual([]);
  });
});

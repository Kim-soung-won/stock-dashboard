import { describe, expect, it } from 'vitest';
import type { RealtimeItem } from './kiwoom-ws.session';
import { toRankingItems } from '../market/ranking.mapper';
import { toAccumulatedTradeValueWon, toExecution, toMarketStatus, toTick } from './realtime.mapper';

/**
 * 스펙의 함정(부호가 방향 표시, 백만원 단위, 문자열 값)이 도메인 모델로 넘어가지
 * 않는다는 것을 고정한다. 값 예시는 스펙의 응답 예시(0B/00/0s)에서 가져왔다.
 */

const tickItem: RealtimeItem = {
  type: '0B',
  item: '005930',
  values: {
    '20': '165208', // 체결시간
    '10': '-20800', // 현재가: 부호는 "하락" 표시이고 값은 20800원
    '11': '-50', // 전일대비: 부호가 의미 그대로
    '12': '-0.24', // 등락율
    '13': '30379732', // 누적거래량
    '14': '632640', // 누적거래대금(백만원)
    '25': '5', // 전일대비기호 5 = 하락
  },
};

describe('toTick (0B 주식체결)', () => {
  it('가격의 마이너스 부호를 값이 아니라 방향으로 읽는다', () => {
    const tick = toTick(tickItem);

    expect(tick.price).toBe(20800);
    expect(tick.direction).toBe('down');
  });

  it('전일대비는 부호를 유지한다', () => {
    expect(toTick(tickItem).change).toBe(-50);
    expect(toTick(tickItem).changeRate).toBe(-0.24);
  });

  it('체결시간 HHmmss 를 사람이 읽는 형식으로 바꾼다', () => {
    expect(toTick(tickItem).at).toBe('16:52:08');
  });

  it('거래소 접미사를 뗀 종목코드를 쓴다', () => {
    expect(toTick({ ...tickItem, item: '005930_NX' }).code).toBe('005930');
  });

  it('값이 없으면(빈 문자열) 0 이 아니라 null 이다', () => {
    const empty = toTick({ ...tickItem, values: { ...tickItem.values, '10': '' } });
    expect(empty.price).toBeNull();
  });
});

describe('toAccumulatedTradeValueWon', () => {
  it('누적거래대금(FID 14)은 백만원 단위이므로 원으로 환산한다', () => {
    expect(toAccumulatedTradeValueWon(tickItem)).toBe(632_640_000_000);
  });
});

describe('toExecution (00 주문체결)', () => {
  const executionItem: RealtimeItem = {
    type: '00',
    item: '',
    values: {
      '9203': '0000123',
      '9001': '005930',
      '302': '삼성전자',
      '907': '2', // 매도수구분 2 = 매수
      '910': '20800',
      '911': '10',
      '908': '093015',
    },
  };

  it('매도수구분 코드로 매수/매도를 판정한다', () => {
    expect(toExecution(executionItem).side).toBe('buy');
    expect(toExecution({ ...executionItem, values: { ...executionItem.values, '907': '1' } }).side).toBe(
      'sell',
    );
  });

  it('체결가·체결량을 숫자로 준다', () => {
    const execution = toExecution(executionItem);
    expect(execution.filledPrice).toBe(20800);
    expect(execution.filledQuantity).toBe(10);
    expect(execution.orderNo).toBe('0000123');
  });
});

describe('toMarketStatus (0s 장시작시간)', () => {
  it('장운영구분 코드를 장 상태로 바꾼다', () => {
    const status = (code: string) =>
      toMarketStatus({ type: '0s', item: '', values: { '215': code } }).phase;

    expect(status('0')).toBe('preOpen');
    expect(status('3')).toBe('open');
    expect(status('4')).toBe('closed');
    expect(status('')).toBe('unknown');
  });
});

describe('종목코드 정규화 (TR 계열별 표기 차이)', () => {
  it('계좌 계열의 A 접두사를 뗀다 — 시세 계열 코드와 같은 키가 되어야 한다', () => {
    // 실제 kt00018 / 실시간 00 응답이 A005930 형태로 온다.
    const execution = toExecution({
      type: '00',
      item: '',
      values: { '9203': '1', '9001': 'A005930', '907': '2' },
    });

    expect(execution.code).toBe('005930');
  });

  it('문자가 섞인 ETF 코드도 접두사만 떼고 보존한다', () => {
    const execution = toExecution({
      type: '00',
      item: '',
      values: { '9203': '1', '9001': 'A0194M0', '907': '2' },
    });

    expect(execution.code).toBe('0194M0');
  });
});

describe('순위 매퍼 (ranking.mapper)', () => {
  it('거래량 센티넬(UINT32 최댓값)은 값 없음으로 떨어뜨린다', () => {
    const [item] = toRankingItems('volume', [
      { stk_cd: '252670', stk_nm: 'KODEX 200선물인버스2X', cur_prc: '-74', trde_qty: '4294967295' },
    ]);

    // 43억주는 실제 수량이 아니라 오버플로 값이다.
    expect(item?.volume).toBeNull();
    expect(item?.price).toBe(74);
  });

  it('거래대금(백만원 단위)을 원으로 환산한다', () => {
    const [item] = toRankingItems('value', [
      { stk_cd: '005930', stk_nm: '삼성전자', now_rank: '1', pred_rank: '2', trde_prica: '7703214' },
    ]);

    expect(item?.tradeValue).toBe(7_703_214_000_000);
    // 전일 2위 → 현재 1위 = 한 계단 상승
    expect(item?.rankChange).toBe(1);
  });

  it('인기 순위(views)의 순위 변동은 부호와 값이 분리돼 온다', () => {
    const [up, flat] = toRankingItems('views', [
      { stk_cd: '005930', stk_nm: '삼성전자', bigd_rank: '1', rank_chg: '3', rank_chg_sign: '-' },
      { stk_cd: '000660', stk_nm: 'SK하이닉스', bigd_rank: '2', rank_chg: '', rank_chg_sign: '' },
    ]);

    expect(up?.rankChange).toBe(-3);
    // 변동 없으면 빈 문자열이 온다 → 0 이 아니라 null
    expect(flat?.rankChange).toBeNull();
  });
});

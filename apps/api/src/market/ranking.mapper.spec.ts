import { describe, expect, it } from 'vitest';
import { toRankingItems } from './ranking.mapper';

/**
 * 순위 mapper 계약: TR 마다 다른 필드를 하나의 RankingItem 으로 흡수하되,
 *  - 거래량의 UINT32_MAX(오버플로 센티넬)는 "값 없음(null)"으로 떨군다.
 *  - 거래대금은 백만원→원 환산, 순위변동은 (전일순위 − 현재순위) 부호를 유지.
 *  - 코드가 빈 행은 버린다.
 */
describe('toRankingItems(volume)', () => {
  it('UINT32_MAX 거래량은 실제 수량이 아니라 오버플로라 null 로 떨군다', () => {
    const [item] = toRankingItems('volume', [
      { stk_cd: 'A005930', stk_nm: '삼성전자', cur_prc: '-70000', trde_qty: '4294967295' },
    ]);
    expect(item?.volume).toBeNull();
    expect(item?.price).toBe(70_000); // 부호는 방향, 값은 절대값
  });
});

describe('toRankingItems(value)', () => {
  it('거래대금은 백만원→원, 순위변동은 전일−현재 부호를 유지한다', () => {
    const [item] = toRankingItems('value', [
      {
        stk_cd: 'A005930',
        stk_nm: '삼성전자',
        cur_prc: '70000',
        now_rank: '2',
        pred_rank: '5',
        trde_prica: '125', // 백만원
      },
    ]);
    expect(item?.tradeValue).toBe(125_000_000);
    expect(item?.rank).toBe(2);
    expect(item?.rankChange).toBe(3); // 5위 → 2위, 3계단 상승
  });
});

describe('toRankingItems 공통', () => {
  it('코드가 빈 행은 버린다', () => {
    const items = toRankingItems('gainers', [
      { stk_cd: 'A035720', stk_nm: '카카오', cur_prc: '50000' },
      { stk_cd: '', stk_nm: '없음' },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.code).toBe('035720');
  });
});

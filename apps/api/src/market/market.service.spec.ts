import { describe, expect, it, vi } from 'vitest';
import type { CandleInterval } from '@stock/contracts';
import type { KiwoomRestClient } from '../kiwoom/kiwoom-rest.client';
import type { PrismaService } from '../prisma/prisma.service';
import { MarketService } from './market.service';

/**
 * getCandles 라우팅 계약:
 *  - 일/주/월/연봉은 각자의 TR(ka10081·82·83·94)을 부르고 응답 배열 키만 다르다.
 *    요청 파라미터·응답 필드(dt·OHLCV)가 같아 한 변환(toPeriodCandles)을 공유한다.
 *  - 분봉은 ka10080 을 tic_scope 로 부른다.
 * KiwoomRestClient 는 목킹한다(네트워크·실 DB 없음).
 */
const periodRows = [
  { dt: '20260101', open_pric: '100', high_pric: '110', low_pric: '90', cur_prc: '105', trde_qty: '1000' },
];

const makeService = (call: ReturnType<typeof vi.fn>) => {
  const kiwoom = { call } as unknown as KiwoomRestClient;
  return new MarketService(kiwoom, {} as PrismaService);
};

describe('MarketService.getCandles — 기간봉 라우팅', () => {
  const cases: [CandleInterval, string, string][] = [
    ['day', 'ka10081', 'stk_dt_pole_chart_qry'],
    ['week', 'ka10082', 'stk_stk_pole_chart_qry'],
    ['month', 'ka10083', 'stk_mth_pole_chart_qry'],
    ['year', 'ka10094', 'stk_yr_pole_chart_qry'],
  ];

  it.each(cases)('%s 봉은 %s 를 부르고 응답 배열키(%s)를 읽는다', async (interval, tr, key) => {
    const call = vi.fn().mockResolvedValue({ data: { [key]: periodRows } });
    const service = makeService(call);

    const candles = await service.getCandles('005930', interval, '20260101');

    expect(call).toHaveBeenCalledWith(tr, {
      stk_cd: '005930',
      base_dt: '20260101',
      upd_stkpc_tp: '1',
    });
    expect(candles).toHaveLength(1);
    expect(candles[0]?.close).toBe(105);
  });

  it('분봉은 ka10080 을 tic_scope 로 부른다', async () => {
    const call = vi.fn().mockResolvedValue({ data: { stk_min_pole_chart_qry: [] } });
    const service = makeService(call);

    await service.getCandles('005930', '5m', '20260101');

    expect(call).toHaveBeenCalledWith('ka10080', expect.objectContaining({ tic_scope: '5' }));
  });
});

import { describe, expect, it } from 'vitest';
import type { Tick } from '@stock/contracts';
import { applyTickToCandles, formatCandleLabel, toChartSeriesData } from './chart.libs';

const tick = (overrides: Partial<Tick> = {}): Tick => ({
  code: '005930',
  price: 20_900,
  direction: 'up',
  change: 100,
  changeRate: 0.48,
  volume: 30_379_732,
  at: '16:52:08',
  ...overrides,
});

describe('applyTickToCandles', () => {
  const candles = [
    { at: '2026-08-20', open: 20_000, high: 20_500, low: 19_900, close: 20_400, volume: 100 },
    { at: '2026-08-21', open: 20_400, high: 20_900, low: 20_300, close: 20_800, volume: 200 },
  ];

  it('마지막 봉의 종가만 실시간 값으로 바꾼다', () => {
    const [, last] = applyTickToCandles(candles, tick({ price: 21_000 }));

    expect(last?.close).toBe(21_000);
    expect(last?.open).toBe(20_400);
  });

  it('실시간 가격이 기존 고가를 넘으면 고가를 늘린다', () => {
    const [, last] = applyTickToCandles(candles, tick({ price: 21_500 }));

    expect(last?.high).toBe(21_500);
    expect(last?.low).toBe(20_300);
  });

  it('이전 봉은 건드리지 않는다', () => {
    const [first] = applyTickToCandles(candles, tick({ price: 30_000 }));

    expect(first).toEqual(candles[0]);
  });

  it('가격 없는 틱은 무시한다', () => {
    expect(applyTickToCandles(candles, tick({ price: null }))).toBe(candles);
  });
});

describe('toChartSeriesData (ECharts 캔들 포맷)', () => {
  const candles = [
    { at: '2026-08-20', open: 20_400, high: 20_900, low: 20_300, close: 20_800, volume: 200 },
    { at: '2026-08-21', open: 20_800, high: 21_000, low: 20_100, close: 20_200, volume: 300 },
  ];

  it('ECharts candlestick 순서 [시가, 종가, 저가, 고가] 로 만든다', () => {
    const series = toChartSeriesData(candles);

    // OHLC 순서가 아니다. 틀리면 차트가 조용히 이상하게 그려진다.
    expect(series.candles[0]).toEqual([20_400, 20_800, 20_300, 20_900]);
  });

  it('거래량에 상승/하락 방향을 함께 담아 막대 색을 나눌 수 있게 한다', () => {
    const series = toChartSeriesData(candles);

    expect(series.volumes[0]).toEqual({ value: 200, rising: true });
    expect(series.volumes[1]).toEqual({ value: 300, rising: false });
  });

  it('x축 카테고리는 봉의 시각 그대로 쓴다', () => {
    expect(toChartSeriesData(candles).categories).toEqual(['2026-08-20', '2026-08-21']);
  });

  it('시/고/저/종 중 하나라도 없는 봉은 제외한다 — 캔들을 그릴 수 없다', () => {
    const withHole = [...candles, { at: '2026-08-22', open: null, high: null, low: null, close: null, volume: 0 }];

    expect(toChartSeriesData(withHole).candles).toHaveLength(2);
  });
});

describe('formatCandleLabel', () => {
  it('일봉은 MM/DD 로 줄인다', () => {
    expect(formatCandleLabel('2026-08-21')).toBe('08/21');
  });

  it('분봉(ISO)은 HH:mm 으로 줄인다', () => {
    expect(formatCandleLabel('2026-08-21T09:31:00')).toBe('09:31');
  });
});

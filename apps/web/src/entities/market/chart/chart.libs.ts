import type { Candle, Tick } from '@stock/contracts';

/**
 * 실시간 체결로 마지막 봉만 갱신한다.
 *
 * 과거 봉은 REST 로 한 번 받아 캐시하고, 장중 변화는 이 함수로 반영한다.
 * 봉 전체를 다시 조회하는 방식은 유량 낭비이고 화면도 튄다.
 */
export const applyTickToCandles = (candles: Candle[], tick: Tick): Candle[] => {
  if (candles.length === 0 || tick.price === null) return candles;

  const last = candles[candles.length - 1];
  if (!last) return candles;

  const updated: Candle = {
    ...last,
    close: tick.price,
    high: last.high === null ? tick.price : Math.max(last.high, tick.price),
    low: last.low === null ? tick.price : Math.min(last.low, tick.price),
    volume: tick.volume ?? last.volume,
  };
  return [...candles.slice(0, -1), updated];
};

/** 차트 y축 범위. 위아래 여백을 조금 둬야 봉이 잘리지 않는다. */
export const candleRange = (candles: Candle[]): { min: number; max: number } => {
  const values = candles.flatMap((candle) =>
    [candle.high, candle.low].filter((value): value is number => value !== null),
  );
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.05 || max * 0.01;
  return { min: min - padding, max: max + padding };
};

/**
 * ECharts 캔들 시리즈용 데이터 정형.
 *
 * ECharts candlestick 의 데이터 순서는 **[시가, 종가, 저가, 고가]** 다(OHLC 순서가
 * 아니다). 이 순서를 틀리면 차트가 조용히 이상하게 그려지므로 한 곳에서만 만든다.
 * 스타일·옵션은 features 계층이 맡고, 여기서는 도메인 데이터 → 배열 변환만 한다.
 */
export interface ChartSeriesData {
  /** x축 카테고리 (일봉 yyyy-MM-dd, 분봉 ISO) */
  categories: string[];
  /** [시가, 종가, 저가, 고가] */
  candles: [number, number, number, number][];
  /** 거래량. 상승/하락 색을 나누기 위해 방향을 함께 담는다 */
  volumes: { value: number; rising: boolean }[];
}

export const toChartSeriesData = (candles: Candle[]): ChartSeriesData => {
  const usable = candles.filter(
    (candle) => candle.open !== null && candle.close !== null && candle.high !== null && candle.low !== null,
  );

  return {
    categories: usable.map((candle) => candle.at),
    candles: usable.map((candle) => [
      candle.open as number,
      candle.close as number,
      candle.low as number,
      candle.high as number,
    ]),
    volumes: usable.map((candle) => ({
      value: candle.volume ?? 0,
      rising: (candle.close as number) >= (candle.open as number),
    })),
  };
};

/** x축 라벨. 일봉은 MM/DD, 분봉(ISO)은 HH:mm 으로 줄인다. */
export const formatCandleLabel = (at: string): string => {
  if (at.includes('T')) return at.slice(11, 16);
  return at.slice(5).replace('-', '/');
};

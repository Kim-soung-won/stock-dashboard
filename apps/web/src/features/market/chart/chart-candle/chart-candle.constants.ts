import type { CandleInterval } from '@stock/contracts';

/** 봉 간격 라벨. ka10080(분봉) / ka10081(일봉) 로 나뉜다. */
export const INTERVAL_LABEL: Readonly<Record<CandleInterval, string>> = {
  '1m': '1분',
  '5m': '5분',
  '15m': '15분',
  '30m': '30분',
  '60m': '60분',
  day: '일',
};

/** 차트 토글에 노출할 간격. 전부 노출하면 버튼이 너무 많아진다. */
export const SELECTABLE_INTERVALS: readonly CandleInterval[] = ['1m', '5m', '30m', 'day'];

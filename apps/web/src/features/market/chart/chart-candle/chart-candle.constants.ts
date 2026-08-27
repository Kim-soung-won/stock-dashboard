import type { CandleInterval } from '@stock/contracts';

/** 봉 간격 라벨. 분봉(ka10080) / 일·주·월·연봉(ka10081·82·83·94) 로 나뉜다. */
export const INTERVAL_LABEL: Readonly<Record<CandleInterval, string>> = {
  '1m': '1분',
  '5m': '5분',
  '15m': '15분',
  '30m': '30분',
  '60m': '60분',
  day: '일',
  week: '주',
  month: '월',
  year: '년',
};

/** 차트 토글에 노출할 간격. 전부 노출하면 버튼이 너무 많아진다. */
export const SELECTABLE_INTERVALS: readonly CandleInterval[] = [
  '1m',
  '5m',
  '30m',
  'day',
  'week',
  'month',
  'year',
];

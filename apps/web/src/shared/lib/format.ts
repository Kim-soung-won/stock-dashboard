import type { PriceDirection } from '@stock/contracts';

/**
 * 표시 형식 유틸 (도메인 무관).
 *
 * 값 자체의 정규화(부호·단위)는 BFF 가 끝냈다. 여기서는 "보여주는 방법"만 다룬다.
 */

const numberFormat = new Intl.NumberFormat('ko-KR');

export const formatWon = (value: number | null): string =>
  value === null ? '-' : numberFormat.format(value);

export const formatQuantity = formatWon;

/** 등락률: 부호를 항상 붙여 방향이 눈에 보이게 한다. */
export const formatRate = (value: number | null): string => {
  if (value === null) return '-';
  const sign = value > 0 ? '+' : '';
  return sign + value.toFixed(2) + '%';
};

export const formatSignedWon = (value: number | null): string => {
  if (value === null) return '-';
  const sign = value > 0 ? '+' : '';
  return sign + numberFormat.format(value);
};

/** 거래량처럼 큰 수를 축약한다. */
export const formatCompact = (value: number | null): string => {
  if (value === null) return '-';
  if (value >= 100_000_000) return (value / 100_000_000).toFixed(1) + '억';
  if (value >= 10_000) return (value / 10_000).toFixed(1) + '만';
  return numberFormat.format(value);
};

/** 손익 부호 → 방향. 양수 상승(빨강), 음수 하락(파랑), 0/없음 보합. */
export const signDirection = (value: number | null): PriceDirection => {
  if (value === null || value === 0) return 'flat';
  return value > 0 ? 'up' : 'down';
};

/** 상승은 빨강, 하락은 파랑 — 국내 관례. */
export const directionClassName = (direction: PriceDirection): string => {
  if (direction === 'up' || direction === 'upperLimit') return 'value-up';
  if (direction === 'down' || direction === 'lowerLimit') return 'value-down';
  return 'value-flat';
};

export const DIRECTION_LABEL: Readonly<Record<PriceDirection, string>> = {
  up: '상승',
  down: '하락',
  flat: '보합',
  upperLimit: '상한',
  lowerLimit: '하한',
};

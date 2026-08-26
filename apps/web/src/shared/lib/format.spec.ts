import { describe, expect, it } from 'vitest';
import {
  directionClassName,
  formatCompact,
  formatRate,
  formatSignedWon,
  formatWon,
  signDirection,
} from './format';

/**
 * 표시 유틸의 계약을 고정한다. 값 자체(부호·단위)는 BFF 가 정규화했고, 여기서는
 * "없음=-", "등락은 부호를 항상 붙임", "큰 수는 억/만 축약", "방향색 매핑"만 본다.
 */
describe('formatWon', () => {
  it('null 은 "-", 숫자는 천단위 구분한다', () => {
    expect(formatWon(null)).toBe('-');
    expect(formatWon(1234567)).toBe('1,234,567');
  });
});

describe('formatRate', () => {
  it('양수는 +를 붙이고 소수 둘째 자리, null 은 "-"', () => {
    expect(formatRate(null)).toBe('-');
    expect(formatRate(1.5)).toBe('+1.50%');
    expect(formatRate(-2.3)).toBe('-2.30%');
    expect(formatRate(0)).toBe('0.00%');
  });
});

describe('formatSignedWon', () => {
  it('양수만 +를 붙이고 0·음수는 부호 규칙을 따른다', () => {
    expect(formatSignedWon(1000)).toBe('+1,000');
    expect(formatSignedWon(-1000)).toBe('-1,000');
    expect(formatSignedWon(0)).toBe('0');
    expect(formatSignedWon(null)).toBe('-');
  });
});

describe('formatCompact', () => {
  it('조/억/만 단위로 축약하고 그 아래는 천단위 구분한다', () => {
    // 시가총액은 억으로 끊으면 읽을 수 없다(1502조 = 15025000억).
    expect(formatCompact(1_502_500_000_000_000)).toBe('1502.5조');
    expect(formatCompact(150_000_000)).toBe('1.5억');
    expect(formatCompact(15_000)).toBe('1.5만');
    expect(formatCompact(5_000)).toBe('5,000');
    expect(formatCompact(null)).toBe('-');
  });
});

describe('signDirection', () => {
  it('부호로 방향을 정하고 0·null 은 보합이다', () => {
    expect(signDirection(5)).toBe('up');
    expect(signDirection(-5)).toBe('down');
    expect(signDirection(0)).toBe('flat');
    expect(signDirection(null)).toBe('flat');
  });
});

describe('directionClassName', () => {
  it('상한은 상승색, 하한은 하락색으로 묶는다(국내 관례)', () => {
    expect(directionClassName('upperLimit')).toBe('value-up');
    expect(directionClassName('lowerLimit')).toBe('value-down');
    expect(directionClassName('flat')).toBe('value-flat');
  });
});

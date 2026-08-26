import { describe, expect, it } from 'vitest';
import { daysUntil, formatDday } from './season.libs';

/**
 * 시즌 D-day 계산 계약. `now` 를 주입해 시계에 의존하지 않고 고정한다.
 * 남은 시간은 올림(ceil), 지났으면 null/"종료".
 */
const NOW = new Date('2026-08-26T00:00:00.000Z').getTime();
const DAY = 24 * 60 * 60 * 1000;

describe('daysUntil', () => {
  it('남은 시간을 올림한 일수로, 지났으면 null 로 준다', () => {
    expect(daysUntil(new Date(NOW + 3 * DAY).toISOString(), NOW)).toBe(3);
    expect(daysUntil(new Date(NOW + 2.5 * DAY).toISOString(), NOW)).toBe(3); // ceil
    expect(daysUntil(new Date(NOW - DAY).toISOString(), NOW)).toBeNull();
  });
});

describe('formatDday', () => {
  it('종료 시즌은 "종료", 진행 중이면 "D-n"', () => {
    expect(formatDday(new Date(NOW + 12 * DAY).toISOString(), 'ended', NOW)).toBe('종료');
    expect(formatDday(new Date(NOW + 12 * DAY).toISOString(), 'active', NOW)).toBe('D-12');
    expect(formatDday(new Date(NOW - DAY).toISOString(), 'active', NOW)).toBe('종료');
  });
});

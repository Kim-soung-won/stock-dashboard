import { describe, expect, it } from 'vitest';
import type { Tick } from '@stock/contracts';
import { mergeTick, toQuoteEntity } from './quote.libs';

const snapshot = toQuoteEntity({
  code: '005930',
  name: '삼성전자',
  price: 20_800,
  direction: 'flat',
  change: 0,
  changeRate: 0,
  open: 20_850,
  high: 21_150,
  low: 20_450,
  volume: 30_000_000,
  tradeValue: null,
  at: '2026-08-21T00:00:00.000Z',
});

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

describe('mergeTick', () => {
  it('실시간 값으로 현재가·등락을 갱신한다', () => {
    const merged = mergeTick(snapshot, tick());

    expect(merged.price).toBe(20_900);
    expect(merged.direction).toBe('up');
    expect(merged.changeRate).toBe(0.48);
    expect(merged.tickedAt).toBe('16:52:08');
  });

  it('틱에 없는 값(시가·고가·저가)은 스냅샷을 유지한다', () => {
    const merged = mergeTick(snapshot, tick());

    expect(merged.open).toBe(20_850);
    expect(merged.high).toBe(21_150);
    expect(merged.name).toBe('삼성전자');
  });

  it('틱 값이 null 이면 덮어쓰지 않는다 — 0 으로 깜빡이면 안 된다', () => {
    const merged = mergeTick(snapshot, tick({ price: null, volume: null }));

    expect(merged.price).toBe(20_800);
    expect(merged.volume).toBe(30_000_000);
  });
});

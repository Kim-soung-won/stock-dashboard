import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMarketHours } from './market-hours.model';

/**
 * 화면 안내가 서버 판정과 **같은 답**을 내야 한다. 어긋나면 "버튼은 눌리는데 서버가
 * 거부하는"(또는 반대) 상태가 된다. 규칙 자체의 경계는 `@stock/contracts` 의
 * market-hours.spec 이 고정하고, 여기서는 훅이 그 규칙을 그대로 전달하는지 본다.
 */
describe('useMarketHours', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const at = (iso: string) => {
    vi.setSystemTime(new Date(iso));
    return renderHook(() => useMarketHours()).result;
  };

  it('장중에는 열려 있고 사유가 없다', () => {
    const result = at('2026-08-26T02:00:00.000Z'); // 수 11:00 KST
    expect(result.current.isOpen).toBe(true);
    expect(result.current.closedReason).toBeNull();
  });

  it('장외에는 닫히고 이유를 알려준다', () => {
    const result = at('2026-08-26T07:00:00.000Z'); // 수 16:00 KST
    expect(result.current.isOpen).toBe(false);
    expect(result.current.closedReason).toContain('마감');
  });

  it('주말에는 닫힌다', () => {
    expect(at('2026-08-29T02:00:00.000Z').current.isOpen).toBe(false); // 토 11:00 KST
  });

  it('개장 시각이 지나면 다시 읽어 열린 상태로 바뀐다', () => {
    const result = at('2026-08-25T23:59:30.000Z'); // 수 08:59:30 KST
    expect(result.current.isOpen).toBe(false);

    // 09:00 을 넘긴다 — 사용자가 새로고침하지 않아도 버튼이 풀려야 한다.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.isOpen).toBe(true);
  });
});

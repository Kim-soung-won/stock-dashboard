import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/base';
import { debugLog } from './debug-log';

describe('debugLog', () => {
  beforeEach(() => {
    debugLog.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    debugLog.clear();
  });

  it('최신 항목이 위로 온다 — 패널에서 방금 일어난 일을 먼저 본다', () => {
    debugLog.push('info', 'ws', '첫 번째');
    debugLog.push('error', 'query', '두 번째');

    expect(debugLog.getSnapshot()[0]?.message).toBe('두 번째');
  });

  it('링 버퍼라 무한히 쌓이지 않는다 — 장중에는 계속 들어온다', () => {
    for (let index = 0; index < 250; index += 1) debugLog.push('info', 'ws', `#${index}`);

    expect(debugLog.getSnapshot()).toHaveLength(200);
    expect(debugLog.getSnapshot()[0]?.message).toBe('#249');
  });

  it('push 할 때만 스냅샷 참조가 바뀐다 (useSyncExternalStore 계약)', () => {
    const before = debugLog.getSnapshot();
    expect(debugLog.getSnapshot()).toBe(before);

    debugLog.push('info', 'ws', '변경');
    expect(debugLog.getSnapshot()).not.toBe(before);
  });

  it('구독자에게 변경을 알린다', () => {
    const listener = vi.fn();
    const unsubscribe = debugLog.subscribe(listener);

    debugLog.push('warn', 'ws', '알림');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    debugLog.push('warn', 'ws', '해지 후');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('pushError 는 키움 코드를 상세에 남긴다 — 패널만 보고 원인을 알 수 있어야 한다', () => {
    debugLog.pushError('query ["market","quote"]', new ApiError(2, '토큰 발급 실패', '8030', '투자구분 불일치'));

    const entry = debugLog.getSnapshot()[0];
    expect(entry?.level).toBe('error');
    expect(entry?.message).toContain('토큰 발급 실패');
    expect(entry?.detail).toContain('키움 코드: 8030');
    expect(entry?.detail).toContain('투자구분 불일치');
  });

  it('에러 개수만 따로 셀 수 있다 (토글 배지)', () => {
    debugLog.push('info', 'ws', '정상');
    debugLog.push('error', 'query', '실패1');
    debugLog.push('error', 'query', '실패2');

    expect(debugLog.errorCount()).toBe(2);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// 검색 HTTP 는 목킹한다 — 이 테스트가 고정하는 건 "미리 채운 종목이 즉시 확정되는가"다.
vi.mock('@/shared/api/market/symbol', () => ({
  SymbolService: { fetchSymbols: vi.fn(), searchSymbols: vi.fn().mockResolvedValue({ items: [] }) },
}));

import { useSymbolPicker } from './symbol.model';

const renderPicker = (seed?: { code: string; name?: string | null } | null) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useSymbolPicker(seed), { wrapper });
};

/**
 * 차트 옆 주문 창은 "보고 있는 종목"으로 시작해야 한다 — 열자마자 종목을 다시 고르게
 * 하면 같이 배치한 의미가 없다. seed 를 주면 검색 응답을 기다리지 않고 코드가 확정된다.
 */
describe('useSymbolPicker', () => {
  it('seed 가 없으면 빈 입력이고 종목이 정해지지 않았다', () => {
    const { result } = renderPicker();
    expect(result.current.query).toBe('');
    expect(result.current.code).toBeNull();
  });

  it('이름까지 있는 seed 는 이름을 입력창에 넣고 코드를 확정한다', () => {
    const { result } = renderPicker({ code: '005930', name: '삼성전자' });
    expect(result.current.query).toBe('삼성전자');
    expect(result.current.code).toBe('005930');
    expect(result.current.name).toBe('삼성전자');
  });

  it('코드만 있는 seed 도 코드를 확정한다(관심종목은 이름 스냅샷이 없을 수 있다)', () => {
    const { result } = renderPicker({ code: '005930', name: null });
    expect(result.current.code).toBe('005930');
    expect(result.current.name).toBeNull();
  });

  it('reset 하면 입력과 선택이 모두 비워진다', () => {
    const { result } = renderPicker({ code: '005930', name: '삼성전자' });
    act(() => result.current.reset());
    expect(result.current.code).toBeNull();
  });
});

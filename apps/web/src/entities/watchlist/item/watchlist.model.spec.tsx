import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authStore } from '@/shared/lib';

// 서비스(HTTP)는 목킹한다 — 이 테스트가 고정하는 건 toggle 의 add/remove 결정 로직이다.
vi.mock('@/shared/api/watchlist/item', () => ({
  WatchlistService: { fetchList: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

import { WatchlistService } from '@/shared/api/watchlist/item';
import { useWatchlist } from './watchlist.model';
import { watchlistQueries } from './watchlist.queries';

const LIST = [{ code: '005930', name: '삼성전자', createdAt: '2026-08-26T00:00:00.000Z' }];
const emptyPayload = { items: [], total: 0, nextKey: null };

const renderUseWatchlist = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // 서버 조회 없이 목록을 시드해 isWatched 를 동기적으로 판정하게 한다.
  queryClient.setQueryData(watchlistQueries.list().queryKey, LIST);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useWatchlist(), { wrapper });
};

describe('useWatchlist', () => {
  beforeEach(() => {
    authStore.setToken('test-token'); // list 쿼리 enabled 조건
    vi.mocked(WatchlistService.fetchList).mockResolvedValue({
      items: LIST,
      total: LIST.length,
      nextKey: null,
    });
    vi.mocked(WatchlistService.add).mockResolvedValue(emptyPayload);
    vi.mocked(WatchlistService.remove).mockResolvedValue(emptyPayload);
  });

  afterEach(() => {
    authStore.clear();
    vi.clearAllMocks();
  });

  it('isWatched 는 담긴 종목에만 true 다', () => {
    const { result } = renderUseWatchlist();
    expect(result.current.isWatched('005930')).toBe(true);
    expect(result.current.isWatched('000660')).toBe(false);
  });

  it('이미 담긴 종목을 toggle 하면 remove 한다', async () => {
    const { result } = renderUseWatchlist();
    result.current.toggle('005930');
    await waitFor(() => expect(WatchlistService.remove).toHaveBeenCalledWith('005930'));
    expect(WatchlistService.add).not.toHaveBeenCalled();
  });

  it('안 담긴 종목을 toggle 하면 이름과 함께 add 한다', async () => {
    const { result } = renderUseWatchlist();
    result.current.toggle('000660', '카카오');
    await waitFor(() =>
      expect(WatchlistService.add).toHaveBeenCalledWith({ code: '000660', name: '카카오' }),
    );
    expect(WatchlistService.remove).not.toHaveBeenCalled();
  });
});

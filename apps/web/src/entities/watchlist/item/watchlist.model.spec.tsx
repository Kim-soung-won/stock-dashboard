import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
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

  /**
   * ★ 는 "눌렀는데 반응이 없다"가 곧바로 드러나는 UI 다. 서버 왕복이 끝나기 전에 목록이
   * 이미 바뀌어 있어야 하고, 실패하면 원래대로 되돌아가야 한다.
   */
  describe('낙관적 갱신', () => {
    /** 응답을 영원히 붙잡아 둔다 — 이 동안 보이는 상태가 곧 "왕복 전" 상태다. */
    const pending = () => new Promise<never>(() => {});

    it('담으면 서버 응답을 기다리지 않고 목록에 나타난다', async () => {
      vi.mocked(WatchlistService.add).mockReturnValue(pending());
      const { result } = renderUseWatchlist();

      act(() => result.current.toggle('000660', '카카오'));

      await waitFor(() => expect(result.current.isWatched('000660')).toBe(true));
      expect(result.current.items.find((item) => item.code === '000660')?.name).toBe('카카오');
    });

    it('빼면 서버 응답을 기다리지 않고 목록에서 사라진다', async () => {
      vi.mocked(WatchlistService.remove).mockReturnValue(pending());
      const { result } = renderUseWatchlist();
      expect(result.current.isWatched('005930')).toBe(true);

      act(() => result.current.toggle('005930'));

      await waitFor(() => expect(result.current.isWatched('005930')).toBe(false));
    });

    it('추가가 실패하면 되돌린다 — 원래 목록은 남는다', async () => {
      vi.mocked(WatchlistService.add).mockRejectedValue(new Error('네트워크 오류'));
      const { result } = renderUseWatchlist();

      act(() => result.current.toggle('000660'));

      await waitFor(() => expect(WatchlistService.add).toHaveBeenCalled());
      await waitFor(() => expect(result.current.isWatched('000660')).toBe(false));
      expect(result.current.isWatched('005930')).toBe(true);
    });

    it('삭제가 실패하면 빼놨던 종목이 되살아난다', async () => {
      vi.mocked(WatchlistService.remove).mockRejectedValue(new Error('네트워크 오류'));
      const { result } = renderUseWatchlist();

      act(() => result.current.toggle('005930'));

      await waitFor(() => expect(WatchlistService.remove).toHaveBeenCalled());
      await waitFor(() => expect(result.current.isWatched('005930')).toBe(true));
    });
  });
});

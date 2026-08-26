import { quoteQueries } from '@/entities/market/quote';
import { watchlistQueries } from '@/entities/watchlist/item';
import { authStore, queryClient } from '@/shared/lib';

/**
 * 메인 진입 시 관심종목과 그 시세 스냅샷을 미리 받아둔다(첫 렌더 깜빡임 방지).
 *
 * 관심종목은 이제 서버(참가자 스코프)가 진실이다 — 예전 localStorage 저장소를 대체했다.
 * 비로그인 진입은 RequireAuth 가 로그인으로 돌리므로, 여기서는 토큰이 있을 때만 시도하고
 * 프리페치는 최선노력으로 둔다(실패해도 컴포넌트가 다시 조회한다).
 */
export const homeLoader = async (): Promise<null> => {
  if (!authStore.getToken()) return null;
  try {
    const items = await queryClient.fetchQuery(watchlistQueries.list());
    await Promise.all(
      items.map((item) => queryClient.prefetchQuery(quoteQueries.detail(item.code))),
    );
  } catch {
    /* 최선노력 프리페치 */
  }
  return null;
};

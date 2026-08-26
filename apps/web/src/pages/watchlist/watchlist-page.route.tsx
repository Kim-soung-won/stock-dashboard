import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const WatchlistPage = lazy(async () => ({
  default: (await import('./watchlist-page.ui')).WatchlistPage,
}));

export const watchlistRoute: RouteObject = {
  path: pathKeys.watchlist.list,
  element: (
    <Suspense fallback={<p className="state">관심종목 로딩 중…</p>}>
      <WatchlistPage />
    </Suspense>
  ),
};

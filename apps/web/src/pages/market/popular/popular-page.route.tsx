import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const PopularPage = lazy(async () => ({
  default: (await import('./popular-page.ui')).PopularPage,
}));

export const popularRoute: RouteObject = {
  path: pathKeys.market.popular,
  element: (
    <Suspense fallback={<p className="state">인기 종목 로딩 중…</p>}>
      <PopularPage />
    </Suspense>
  ),
};

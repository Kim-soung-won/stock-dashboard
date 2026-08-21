import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const SymbolsPage = lazy(async () => ({
  default: (await import('./symbols-page.ui')).SymbolsPage,
}));

export const symbolsRoute: RouteObject = {
  path: pathKeys.market.symbols,
  element: (
    <Suspense fallback={<p className="state">종목 탐색 로딩 중…</p>}>
      <SymbolsPage />
    </Suspense>
  ),
};

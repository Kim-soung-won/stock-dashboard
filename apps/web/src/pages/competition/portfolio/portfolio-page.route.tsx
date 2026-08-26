import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const PortfolioPage = lazy(async () => ({
  default: (await import('./portfolio-page.ui')).PortfolioPage,
}));

export const portfolioRoute: RouteObject = {
  path: pathKeys.competition.portfolio,
  element: (
    <Suspense fallback={<p className="state">포트폴리오 로딩 중…</p>}>
      <PortfolioPage />
    </Suspense>
  ),
};

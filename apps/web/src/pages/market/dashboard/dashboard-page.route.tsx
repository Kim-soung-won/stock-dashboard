import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';
import { dashboardLoader } from './dashboard-page.model';

const DashboardPage = lazy(async () => ({
  default: (await import('./dashboard-page.ui')).DashboardPage,
}));

export const dashboardRoute: RouteObject = {
  path: pathKeys.market.dashboard,
  loader: dashboardLoader,
  element: (
    <Suspense fallback={<p className="state">대시보드 로딩 중…</p>}>
      <DashboardPage />
    </Suspense>
  ),
};

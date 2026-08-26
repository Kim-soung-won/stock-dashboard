import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';
import { homeLoader } from './home-page.model';

const HomePage = lazy(async () => ({
  default: (await import('./home-page.ui')).HomePage,
}));

/** 메인은 셸의 index 라우트다 — `/` 진입과 로고 클릭이 모두 여기로 온다. */
export const homeRoute: RouteObject = {
  index: true,
  loader: homeLoader,
  element: (
    <Suspense fallback={<p className="state">메인 화면 로딩 중…</p>}>
      <HomePage />
    </Suspense>
  ),
};

/**
 * 통합 전 두 경로(실시간 대시보드·인기 종목)는 메인으로 돌린다.
 * 열려 있던 탭이나 북마크가 404 로 떨어지지 않게 남겨두는 리다이렉트다.
 */
export const legacyMarketRoutes: RouteObject[] = [
  pathKeys.legacy.dashboard,
  pathKeys.legacy.popular,
].map((path) => ({ path, element: <Navigate to={pathKeys.market.home} replace /> }));

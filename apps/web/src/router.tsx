import { Navigate, createBrowserRouter } from 'react-router-dom';
import { loginRoute } from '@/pages/auth';
import { balanceRoute } from '@/pages/account';
import { leaderboardRoute, portfolioRoute } from '@/pages/competition';
import { dashboardRoute, popularRoute, symbolsRoute } from '@/pages/market';
import { orderRoute } from '@/pages/trading';
import { pathKeys } from '@/shared/lib';
import { AppLayout } from './app-layout';
import { RequireAuth } from './require-auth';
import { RouteErrorBoundary } from './route-error-boundary';

/** 라우트는 각 page 슬라이스가 자기 route 객체를 내보내고, 여기서 조립만 한다. */
export const router = createBrowserRouter([
  // 로그인은 앱 셸 밖의 독립 화면이다(로그인 전에는 사이드바가 없다).
  loginRoute,
  {
    path: pathKeys.root,
    // 셸 전체를 인증 게이트로 감싼다 — 로그인해야 대시보드를 볼 수 있다.
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    // loader 예외·없는 경로는 컴포넌트 바운더리가 아니라 여기로 온다.
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to={pathKeys.competition.leaderboard} replace /> },
      leaderboardRoute,
      portfolioRoute,
      dashboardRoute,
      popularRoute,
      symbolsRoute,
      balanceRoute,
      orderRoute,
    ],
  },
]);

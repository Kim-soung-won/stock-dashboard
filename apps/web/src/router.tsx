import { Navigate, createBrowserRouter } from 'react-router-dom';
import { balanceRoute } from '@/pages/account';
import { dashboardRoute, popularRoute, symbolsRoute } from '@/pages/market';
import { orderRoute } from '@/pages/trading';
import { pathKeys } from '@/shared/lib';
import { AppLayout } from './app-layout';
import { RouteErrorBoundary } from './route-error-boundary';

/** 라우트는 각 page 슬라이스가 자기 route 객체를 내보내고, 여기서 조립만 한다. */
export const router = createBrowserRouter([
  {
    path: pathKeys.root,
    element: <AppLayout />,
    // loader 예외·없는 경로는 컴포넌트 바운더리가 아니라 여기로 온다.
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <Navigate to={pathKeys.market.dashboard} replace /> },
      dashboardRoute,
      popularRoute,
      symbolsRoute,
      balanceRoute,
      orderRoute,
    ],
  },
]);

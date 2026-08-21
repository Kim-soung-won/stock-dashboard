import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const BalancePage = lazy(async () => ({
  default: (await import('./balance-page.ui')).BalancePage,
}));

export const balanceRoute: RouteObject = {
  path: pathKeys.account.balance,
  element: (
    <Suspense fallback={<p className="state">계좌 로딩 중…</p>}>
      <BalancePage />
    </Suspense>
  ),
};

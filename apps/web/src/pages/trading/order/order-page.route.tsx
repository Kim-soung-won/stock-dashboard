import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const OrderPage = lazy(async () => ({
  default: (await import('./order-page.ui')).OrderPage,
}));

export const orderRoute: RouteObject = {
  path: pathKeys.trading.order,
  element: (
    <Suspense fallback={<p className="state">주문 화면 로딩 중…</p>}>
      <OrderPage />
    </Suspense>
  ),
};

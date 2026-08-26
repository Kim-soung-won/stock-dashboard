import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const LoginPage = lazy(async () => ({
  default: (await import('./login-page.ui')).LoginPage,
}));

export const loginRoute: RouteObject = {
  path: pathKeys.auth.login,
  element: (
    <Suspense fallback={<p className="state">로딩 중…</p>}>
      <LoginPage />
    </Suspense>
  ),
};

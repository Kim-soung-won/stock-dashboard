import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';

const ProfilePage = lazy(async () => ({
  default: (await import('./profile-page.ui')).ProfilePage,
}));

export const profileRoute: RouteObject = {
  // `:id` 는 참가자 id, 또는 내 프로필을 뜻하는 `me`.
  path: '/profile/:id',
  element: (
    <Suspense fallback={<p className="state">프로필 로딩 중…</p>}>
      <ProfilePage />
    </Suspense>
  ),
};

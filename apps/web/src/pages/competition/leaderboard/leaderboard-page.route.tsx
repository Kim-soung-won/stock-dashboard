import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { pathKeys } from '@/shared/lib';

const LeaderboardPage = lazy(async () => ({
  default: (await import('./leaderboard-page.ui')).LeaderboardPage,
}));

export const leaderboardRoute: RouteObject = {
  path: pathKeys.competition.leaderboard,
  element: (
    <Suspense fallback={<p className="state">리더보드 로딩 중…</p>}>
      <LeaderboardPage />
    </Suspense>
  ),
};

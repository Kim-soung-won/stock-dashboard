import { leaderboardQueries } from '@/entities/competition/leaderboard';
import { TableLeaderboard } from '@/features/competition/leaderboard';
import { Panel, QueryErrorBoundary } from '@/shared/ui';

/**
 * 리더보드 화면 — 경쟁의 중심. 모든 참가자의 수익률 순위를 실시간으로 보여준다.
 */
export const LeaderboardPage = () => (
  <div className="page">
    <header className="page__head">
      <h1>리더보드</h1>
    </header>

    <Panel title="실시간 순위">
      <QueryErrorBoundary
        context="competition:leaderboard"
        queryKey={leaderboardQueries.all()}
        fallback={<p className="state">순위 불러오는 중…</p>}
      >
        <TableLeaderboard />
      </QueryErrorBoundary>
    </Panel>
  </div>
);

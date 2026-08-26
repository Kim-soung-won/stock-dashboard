import { leaderboardQueries } from '@/entities/competition/leaderboard';
import { ChartLeaderboard, TableLeaderboard } from '@/features/competition/leaderboard';
import { ErrorBoundary, Panel, QueryErrorBoundary } from '@/shared/ui';

/**
 * 리더보드 화면 — 경쟁의 중심.
 *
 * 표는 "지금 순위"를 실시간(WS)으로, 라인차트는 "시간에 따른 총평가금액 추이"를 보여줘
 * 참가자들이 어떻게 벌어졌는지 시각적으로 비교하게 한다. 차트는 표와 독립적으로 실패·로딩
 * 하므로 별도 바운더리로 감싼다(한쪽이 비어도 다른 쪽은 보인다).
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

    <Panel title="총평가금액 추이">
      <ErrorBoundary context="competition:leaderboard-history">
        <ChartLeaderboard />
      </ErrorBoundary>
    </Panel>
  </div>
);

import { portfolioQueries } from '@/entities/competition/portfolio';
import { SummaryPortfolio, TableHoldings, TableTrades } from '@/features/competition/portfolio';
import { FormTrade } from '@/features/competition/trade';
import { ErrorBoundary, Panel, QueryErrorBoundary } from '@/shared/ui';

/**
 * 내 포트폴리오 화면.
 *
 * 매매 → 요약 → 보유 → 이력이 한 화면에 있어 체결 직후 잔고·수익률 변화가 바로 보인다.
 * 영역마다 조회가 다르므로 바운더리도 영역별로 둔다(매매 폼은 조회 실패와 무관하게 살아 있다).
 */
export const PortfolioPage = () => (
  <div className="page">
    <header className="page__head">
      <h1>내 포트폴리오</h1>
    </header>

    <div className="layout-two">
      <Panel title="매매 (시장가)">
        <ErrorBoundary context="competition:trade">
          <FormTrade />
        </ErrorBoundary>
      </Panel>

      <Panel title="요약">
        <QueryErrorBoundary
          context="competition:portfolio-summary"
          queryKey={portfolioQueries.all()}
          fallback={<p className="state">불러오는 중…</p>}
        >
          <SummaryPortfolio />
        </QueryErrorBoundary>
      </Panel>
    </div>

    <Panel title="보유 종목">
      <QueryErrorBoundary
        context="competition:holdings"
        queryKey={portfolioQueries.all()}
        fallback={<p className="state">보유 종목 불러오는 중…</p>}
      >
        <TableHoldings />
      </QueryErrorBoundary>
    </Panel>

    <Panel title="체결 이력">
      <QueryErrorBoundary
        context="competition:trades"
        queryKey={portfolioQueries.all()}
        fallback={<p className="state">체결 이력 불러오는 중…</p>}
      >
        <TableTrades />
      </QueryErrorBoundary>
    </Panel>
  </div>
);

import { balanceQueries } from '@/entities/account/balance';
import { SummaryBalance, TableBalance } from '@/features/account/balance';
import { Panel, QueryErrorBoundary } from '@/shared/ui';

/**
 * 계좌 잔고.
 *
 * 요약과 보유 종목이 같은 조회(kt00018/kt00001) 하나에 의존하므로 바운더리 하나로 묶는다.
 * 실패하면 두 영역이 함께 에러 패널로 바뀌고, 재시도는 그 쿼리를 리셋한다.
 */
export const BalancePage = () => (
  <div className="page">
    <header className="page__head">
      <h1>계좌 잔고</h1>
    </header>

    <QueryErrorBoundary
      context="account:balance"
      queryKey={balanceQueries.all()}
      fallback={<p className="state">잔고 조회 중…</p>}
    >
      <SummaryBalance />
      <Panel title="보유 종목">
        <TableBalance />
      </Panel>
    </QueryErrorBoundary>
  </div>
);

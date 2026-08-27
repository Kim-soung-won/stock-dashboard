import { useQuery } from '@tanstack/react-query';
import { balanceQueries } from '@/entities/account/balance';
import { healthQueries } from '@/entities/system/health';
import { SummaryBalance, TableBalance } from '@/features/account/balance';
import { Panel, QueryErrorBoundary } from '@/shared/ui';

/**
 * 계좌 잔고.
 *
 * 요약과 보유 종목이 같은 조회(kt00018/kt00001) 하나에 의존하므로 바운더리 하나로 묶는다.
 * 실패하면 두 영역이 함께 에러 패널로 바뀌고, 재시도는 그 쿼리를 리셋한다.
 *
 * 실계좌 조회가 꺼져 있으면(`ACCOUNT_ENABLED=false`) 조회를 시도하지 않고 안내만 보여준다
 * — 서버도 503 으로 막지만, 북마크로 직접 들어온 사용자에게 에러 패널 대신 사유를 준다.
 */
export const BalancePage = () => {
  const { data: health } = useQuery(healthQueries.status());

  return (
    <div className="page">
      <header className="page__head">
        <h1>계좌 잔고</h1>
      </header>

      {health && !health.accountEnabled ? (
        <p className="state">
          실계좌 조회 기능이 잠시 비활성화되어 있습니다. 관리자가 다시 켜면 잔고를 볼 수 있습니다.
        </p>
      ) : (
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
      )}
    </div>
  );
};

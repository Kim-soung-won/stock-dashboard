import { balanceQueries } from '@/entities/account/balance';
import { TablePendingOrders } from '@/features/account/balance';
import { orderQueries } from '@/entities/trading/order';
import { FormOrder, TableOrderJournal } from '@/features/trading/order';
import { ErrorBoundary, Panel, QueryErrorBoundary } from '@/shared/ui';

/**
 * 주문 화면.
 *
 * 주문 → 미체결 → 저널이 한 화면에 있어야 "접수는 됐는데 체결은 안 된" 상태가 보인다.
 * 세 영역이 서로 다른 조회를 쓰므로 **바운더리도 영역별로 둔다** — 미체결 조회가
 * 실패해도 주문 폼은 계속 쓸 수 있어야 한다.
 */
export const OrderPage = () => (
  <div className="page">
    <header className="page__head">
      <h1>주문</h1>
    </header>

    <div className="layout-two">
      <Panel title="주문 입력">
        <ErrorBoundary context="order:form">
          <FormOrder />
        </ErrorBoundary>
      </Panel>

      <Panel title="미체결">
        <QueryErrorBoundary
          context="order:pending"
          queryKey={balanceQueries.all()}
          fallback={<p className="state">미체결 조회 중…</p>}
        >
          <TablePendingOrders />
        </QueryErrorBoundary>
      </Panel>
    </div>

    <Panel title="주문 저널 (BFF DB)">
      <QueryErrorBoundary
        context="order:journal"
        queryKey={orderQueries.all()}
        fallback={<p className="state">주문 이력 조회 중…</p>}
      >
        <TableOrderJournal />
      </QueryErrorBoundary>
    </Panel>
  </div>
);

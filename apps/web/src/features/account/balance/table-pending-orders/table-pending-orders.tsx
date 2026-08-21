import { useSuspenseQuery } from '@tanstack/react-query';
import { balanceQueries } from '@/entities/account/balance';
import { formatQuantity, formatWon } from '@/shared/lib';

interface TablePendingOrdersProps {
  /** 특정 종목만 볼 때 */
  code?: string;
}

/**
 * 미체결 주문 표 (ka10075).
 *
 * `useSuspenseQuery` 로 바꾼 이유: 이전에는 조회 실패 시 data 가 undefined 가 되어
 * "미체결 주문이 없습니다" 로 보였다. **실패와 빈 데이터가 화면에서 구분되지 않는 것**은
 * 주문 화면에서 특히 위험하다(남아 있는 주문을 없는 것으로 오인). 지금은 실패는
 * 바운더리의 에러 패널, 빈 데이터는 빈 메시지로 갈린다.
 */
export const TablePendingOrders = ({ code }: TablePendingOrdersProps) => {
  const { data: orders } = useSuspenseQuery(balanceQueries.pendingOrders(code));

  return (
    <table className="grid">
      <thead>
        <tr>
          <th>주문번호</th>
          <th>종목</th>
          <th>구분</th>
          <th className="grid__num">미체결/주문</th>
          <th className="grid__num">주문가</th>
          <th>매매구분</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.orderNo}>
            <td>{order.orderNo}</td>
            <td>
              <span className="grid__name">{order.name}</span>
              <span className="grid__code">{order.code}</span>
            </td>
            <td>{order.side === 'buy' ? '매수' : '매도'}</td>
            <td className="grid__num">
              {formatQuantity(order.unfilledQuantity)} / {formatQuantity(order.orderQuantity)}
            </td>
            <td className="grid__num">{formatWon(order.orderPrice)}</td>
            <td>{order.orderTypeLabel ?? '-'}</td>
          </tr>
        ))}
        {orders.length === 0 ? (
          <tr>
            <td colSpan={6} className="state">
              미체결 주문이 없습니다.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
};
